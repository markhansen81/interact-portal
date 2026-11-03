import os, json, re, base64, time
from datetime import datetime, timezone
from dotenv import load_dotenv
import anthropic
from supabase import create_client
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
ANTH_KEY     = os.environ["ANTHROPIC_API_KEY"]
SA_FILE      = os.environ.get("GOOGLE_SA_FILE", "service-account.json")
GMAIL_USER   = os.environ.get("IMAP_USER", "invoices@interactenglish.de")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
claude   = anthropic.Anthropic(api_key=ANTH_KEY)

SINCE = datetime(2025, 1, 1, tzinfo=timezone.utc)

# ── Gmail API client ─────────────────────────────────────────────────────────
def build_gmail():
    creds = service_account.Credentials.from_service_account_file(
        SA_FILE,
        scopes=["https://www.googleapis.com/auth/gmail.readonly"],
    ).with_subject(GMAIL_USER)
    return build("gmail", "v1", credentials=creds, cache_discovery=False)

# ── Load existing TA profiles for matching ──────────────────────────────────
def load_profiles():
    res = supabase.table("profiles").select("id, first_name, last_name, email").eq("role", "ta").execute()
    return res.data or []

def match_ta(name_raw: str, profiles: list) -> str | None:
    name_lower = name_raw.lower().strip()
    for p in profiles:
        fn = (p.get("first_name") or "").lower()
        ln = (p.get("last_name") or "").lower()
        full = f"{fn} {ln}".strip()
        if full and full in name_lower:
            return p["id"]
        if full and name_lower in full:
            return p["id"]
        if ln and ln in name_lower and len(ln) > 3:
            return p["id"]
    return None

# ── Extract invoice data with Claude ────────────────────────────────────────
EXTRACT_PROMPT = """Extract data from this Teaching Artist invoice and return ONLY valid JSON:
{
  "ta_name": "full name of the teaching artist",
  "invoice_number": "invoice reference or null",
  "invoice_date": "YYYY-MM-DD or null",
  "project_name": "name of the project/program or null",
  "school": "school name or null",
  "days": 5,
  "level": 3.3,
  "daily_rate": 150.00,
  "total_amount": 750.00
}

Notes:
- days: number of working days (integer)
- level: their pay level e.g. 1.1, 2.3, 3.3 — look for it on the invoice, often labelled "Level" or "Stufe"
- If a field is missing use null
- Return ONLY the JSON object, no other text"""

def extract_invoice(pdf_bytes: bytes) -> dict:
    try:
        pdf_b64 = base64.standard_b64encode(pdf_bytes).decode()
        msg = claude.messages.create(
            model="claude-opus-4-6",
            max_tokens=1024,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {
                            "type": "base64",
                            "media_type": "application/pdf",
                            "data": pdf_b64,
                        },
                    },
                    {"type": "text", "text": EXTRACT_PROMPT}
                ],
            }]
        )
        text = msg.content[0].text.strip()
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        print(f"  ⚠ Claude extraction error: {e}")
    return {}

# ── Upload PDF to Supabase Storage ───────────────────────────────────────────
def upload_pdf(pdf_bytes: bytes, ta_id: str | None, filename: str) -> str | None:
    try:
        folder = ta_id or "unmatched"
        path = f"ta-invoices/{folder}/{filename}"
        supabase.storage.from_("invoice-evidence").upload(
            path, pdf_bytes, {"content-type": "application/pdf", "upsert": "true"}
        )
        return supabase.storage.from_("invoice-evidence").get_public_url(path)
    except Exception as e:
        print(f"  ⚠ Storage upload error: {e}")
        return None

# ── Check if already scanned ─────────────────────────────────────────────────
def already_scanned(email_subject: str) -> bool:
    res = supabase.table("ta_invoice_history")\
        .select("id")\
        .eq("email_subject", email_subject[:200])\
        .execute()
    return len(res.data or []) > 0

# ── Retry wrapper for transient network errors ───────────────────────────────
def retry(fn, retries=4, backoff=2):
    for attempt in range(retries):
        try:
            return fn()
        except Exception as e:
            if attempt == retries - 1:
                raise
            wait = backoff ** attempt
            print(f"    ⚠ Retry {attempt+1}/{retries} after error: {e} (wait {wait}s)")
            time.sleep(wait)

# ── Fetch PDF attachments from a Gmail message ───────────────────────────────
def get_pdf_attachments(service, msg_id: str) -> list[dict]:
    """Returns list of {filename, data} for each PDF attachment."""
    msg = retry(lambda: service.users().messages().get(userId="me", id=msg_id, format="full").execute())
    parts = msg.get("payload", {}).get("parts", [])
    attachments = []

    def walk_parts(parts):
        for part in parts:
            sub = part.get("parts")
            if sub:
                walk_parts(sub)
                continue
            fname = part.get("filename", "")
            if fname.lower().endswith(".pdf"):
                att_id = part.get("body", {}).get("attachmentId")
                if att_id:
                    att = retry(lambda: service.users().messages().attachments().get(
                        userId="me", messageId=msg_id, id=att_id
                    ).execute())
                    data = base64.urlsafe_b64decode(att["data"])
                    attachments.append({"filename": fname, "data": data})

    walk_parts(parts)
    return attachments

def get_email_date(service, msg_id: str) -> datetime:
    msg = retry(lambda: service.users().messages().get(userId="me", id=msg_id, format="metadata",
                                          metadataHeaders=["Date", "Subject"]).execute())
    headers = {h["name"]: h["value"] for h in msg["payload"]["headers"]}
    from email.utils import parsedate_to_datetime
    try:
        return parsedate_to_datetime(headers.get("Date", ""))
    except Exception:
        ts = int(msg.get("internalDate", 0)) / 1000
        return datetime.fromtimestamp(ts, tz=timezone.utc)

def get_subject(service, msg_id: str) -> str:
    msg = retry(lambda: service.users().messages().get(userId="me", id=msg_id, format="metadata",
                                          metadataHeaders=["Subject"]).execute())
    headers = {h["name"]: h["value"] for h in msg["payload"]["headers"]}
    return headers.get("Subject", "")

# ── Main scan ────────────────────────────────────────────────────────────────
def main():
    print(f"\n🔍 Scanning {GMAIL_USER} for invoices since {SINCE.date()}...\n")
    profiles = load_profiles()
    print(f"  Loaded {len(profiles)} TA profiles\n")

    service = build_gmail()

    # Search: has PDF attachment, after Jan 1 2025
    since_str = SINCE.strftime("%Y/%m/%d")
    query = f"has:attachment filename:pdf after:{since_str}"
    print(f"  Gmail query: {query}")

    msg_ids = []
    page_token = None
    while True:
        kwargs = {"userId": "me", "q": query, "maxResults": 500}
        if page_token:
            kwargs["pageToken"] = page_token
        resp = service.users().messages().list(**kwargs).execute()
        msgs = resp.get("messages", [])
        msg_ids.extend([m["id"] for m in msgs])
        page_token = resp.get("nextPageToken")
        if not page_token:
            break

    print(f"  Found {len(msg_ids)} emails with PDF attachments\n")

    results = []
    errors  = []

    for i, msg_id in enumerate(msg_ids):
        subject = get_subject(service, msg_id)
        date    = get_email_date(service, msg_id)

        if already_scanned(subject):
            print(f"  [{i+1}/{len(msg_ids)}] SKIP (already scanned): {subject[:60]}")
            continue

        # Skip known non-TA vendor emails
        subj_lower = subject.lower()
        SKIP_KEYWORDS = [
            # Travel / expenses
            "lanes & planes", "abrechnungsdokument", "sammelbeleg", "auslagenerstattung",
            "ferienwohnung",
            # SaaS / subscriptions
            "mailchimp", "panda doc", "pandadoc", "squarespace", "vercel", "github",
            "resend", "atlassian", "zoom", "notion", "stripe", "paypal",
            # Accounting / suppliers
            "datev", "fibu", "buchungsvolumen", "factuur",
            # Payment confirmations (not invoices)
            "thanks for your payment", "thank you for your payment",
            "payment confirmation", "payment received",
            # Insurance
            "versicherung",
        ]
        if any(kw in subj_lower for kw in SKIP_KEYWORDS):
            print(f"  [{i+1}/{len(msg_ids)}] SKIP (vendor): {subject[:60]}")
            continue

        print(f"  [{i+1}/{len(msg_ids)}] {date.date()} — {subject[:60]}")

        attachments = get_pdf_attachments(service, msg_id)
        if not attachments:
            continue

        for att in attachments:
            pdf_bytes = att["data"]
            fname     = att["filename"]
            print(f"    📄 {fname} ({len(pdf_bytes)//1024}KB)")

            data = extract_invoice(pdf_bytes)
            if not data:
                errors.append({"subject": subject, "filename": fname})
                continue

            ta_name_raw = data.get("ta_name") or ""
            if not ta_name_raw:
                print(f"    ⏭ SKIP (no TA name extracted — likely not a TA invoice)")
                continue
            ta_id = match_ta(ta_name_raw, profiles) if ta_name_raw else None
            confidence = "high" if ta_id and data.get("level") else ("medium" if ta_id else "low")

            print(f"    👤 {ta_name_raw} → {'matched ✓' if ta_id else 'NO MATCH ⚠'} | Level: {data.get('level')} | Days: {data.get('days')}")

            safe_name = re.sub(r'[^a-zA-Z0-9._-]', '_', fname)
            date_prefix = date.strftime("%Y%m%d")
            pdf_url = upload_pdf(pdf_bytes, ta_id, f"{date_prefix}_{safe_name}")

            row = {
                "ta_id":          ta_id,
                "ta_name_raw":    ta_name_raw,
                "invoice_date":   data.get("invoice_date"),
                "project_name":   data.get("project_name"),
                "school":         data.get("school"),
                "days":           int(round(float(data["days"]))) if data.get("days") is not None else None,
                "level_invoiced": data.get("level"),
                "daily_rate":     data.get("daily_rate"),
                "total_amount":   data.get("total_amount"),
                "invoice_number": data.get("invoice_number"),
                "email_subject":  subject[:200],
                "email_date":     date.isoformat(),
                "pdf_filename":   fname,
                "pdf_url":        pdf_url,
                "confidence":     confidence,
            }
            supabase.table("ta_invoice_history").insert(row).execute()
            results.append(row)

        time.sleep(0.3)

    # ── Summary report ────────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"✅ Scanned {len(results)} invoices")
    print(f"⚠  {len(errors)} extraction failures")

    qualifying = [r for r in results if (r.get("days") or 0) >= 3]
    qualifying.sort(key=lambda r: (r.get("ta_id") or "", r.get("invoice_date") or ""))

    by_ta: dict = {}
    for r in qualifying:
        key = r.get("ta_id") or r.get("ta_name_raw") or "unknown"
        by_ta.setdefault(key, []).append(r)

    print(f"\n{'='*60}")
    print("DISCREPANCY REPORT (calculated level vs invoiced level)")
    print(f"{'='*60}")
    discrepancies = []
    for ta_key, invoices in by_ta.items():
        ta_name = invoices[0].get("ta_name_raw") or ta_key
        for n, inv in enumerate(invoices, 1):
            if n == 1:     calc_lvl = "1"
            elif n <= 5:   calc_lvl = f"2.{n - 1}"
            elif n <= 10:  calc_lvl = f"3.{n - 5}"
            elif n <= 20:  calc_lvl = f"4.{n - 10}"
            else:          calc_lvl = "5"
            inv_lvl = inv.get("level_invoiced")
            if inv_lvl and str(inv_lvl) != calc_lvl:
                discrepancies.append({
                    "ta": ta_name,
                    "project": inv.get("project_name") or "?",
                    "date": inv.get("invoice_date") or "?",
                    "calculated": calc_lvl,
                    "invoiced": float(inv_lvl),
                    "pdf": inv.get("pdf_url"),
                })

    if discrepancies:
        print(f"\n⚠  {len(discrepancies)} discrepancies found:\n")
        for d in discrepancies:
            diff = "OVER" if d["invoiced"] > d["calculated"] else "UNDER"
            print(f"  {d['ta']:<30} {d['date']}  calc={d['calculated']}  invoiced={d['invoiced']}  [{diff}]")
            print(f"    Project: {d['project']}")
            if d["pdf"]:
                print(f"    PDF: {d['pdf']}")
    else:
        print("\n✅ No discrepancies found!")

    print(f"\nDone. Data is in Supabase → ta_invoice_history table.")
    print(f"View in portal: /admin/teaching-artists/[id] → Level Progression\n")

if __name__ == "__main__":
    main()

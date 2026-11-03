# Invoice Scan — Run Instructions
> Scan all invoice emails from Jan 2025, extract data, store in Supabase

## What this does
1. Connects to the invoices inbox via IMAP
2. Fetches all emails from 1 Jan 2025 onwards with PDF attachments
3. Sends each PDF to Claude API for extraction (TA name, project, school, days, level, amount)
4. Matches TA name to portal profiles
5. Uploads PDF to Supabase Storage as evidence
6. Inserts into `ta_invoice_history` table
7. Prints a discrepancy report at the end

---

## Setup (do this first)

```bash
mkdir interact-invoice-scan
cd interact-invoice-scan
python3 -m venv venv
source venv/bin/activate
pip install anthropic supabase imap-tools python-dotenv
```

Create `.env`:
```
IMAP_HOST=imap.gmail.com          # or imap.strato.de etc
IMAP_USER=invoices@interactenglish.de
IMAP_PASSWORD=YOUR_APP_PASSWORD   # Gmail: use App Password not main password
ANTHROPIC_API_KEY=YOUR_KEY
SUPABASE_URL=https://rzpncpxpixjnogjgtwcx.supabase.co
SUPABASE_SERVICE_KEY=YOUR_SERVICE_ROLE_KEY   # Settings → API in Supabase dashboard
```

---

## The Script — save as `scan.py`

```python
import os, json, re, base64, time
from datetime import datetime
from dotenv import load_dotenv
from imap_tools import MailBox, AND, A
import anthropic
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
IMAP_HOST    = os.environ["IMAP_HOST"]
IMAP_USER    = os.environ["IMAP_USER"]
IMAP_PASS    = os.environ["IMAP_PASSWORD"]
ANTH_KEY     = os.environ["ANTHROPIC_API_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
claude   = anthropic.Anthropic(api_key=ANTH_KEY)

SINCE = datetime(2025, 1, 1)

# ── Load existing TA profiles for matching ──────────────────────────────────
def load_profiles():
    res = supabase.table("profiles").select("id, first_name, last_name, email").eq("role", "ta").execute()
    return res.data or []

def match_ta(name_raw: str, profiles: list) -> str | None:
    """Simple name match — first+last or last name."""
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

# ── Extract invoice data with Claude ───────────────────────────────────────
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

# ── Upload PDF to Supabase Storage ──────────────────────────────────────────
def upload_pdf(pdf_bytes: bytes, ta_id: str | None, filename: str) -> str | None:
    try:
        folder = ta_id or "unmatched"
        path = f"ta-invoices/{folder}/{filename}"
        supabase.storage.from_("invoice-evidence").upload(
            path, pdf_bytes, {"content-type": "application/pdf", "upsert": "true"}
        )
        res = supabase.storage.from_("invoice-evidence").get_public_url(path)
        return res
    except Exception as e:
        print(f"  ⚠ Storage upload error: {e}")
        return None

# ── Check if already scanned ────────────────────────────────────────────────
def already_scanned(email_subject: str, email_date: datetime) -> bool:
    res = supabase.table("ta_invoice_history")\
        .select("id")\
        .eq("email_subject", email_subject[:200])\
        .execute()
    return len(res.data or []) > 0

# ── Main scan ───────────────────────────────────────────────────────────────
def main():
    print(f"\n🔍 Scanning {IMAP_USER} for invoices since {SINCE.date()}...\n")
    profiles = load_profiles()
    print(f"  Loaded {len(profiles)} TA profiles\n")

    results = []
    errors  = []

    with MailBox(IMAP_HOST).login(IMAP_USER, IMAP_PASS) as mb:
        messages = list(mb.fetch(
            AND(date_gte=SINCE.date()),
            mark_seen=False,
            bulk=True
        ))
        print(f"  Found {len(messages)} emails since Jan 2025")

        pdf_emails = [m for m in messages if any(
            a.filename and a.filename.lower().endswith(".pdf")
            for a in m.attachments
        )]
        print(f"  {len(pdf_emails)} have PDF attachments\n")

        for i, msg in enumerate(pdf_emails):
            subject = msg.subject or ""
            date    = msg.date

            if already_scanned(subject, date):
                print(f"  [{i+1}/{len(pdf_emails)}] SKIP (already scanned): {subject[:60]}")
                continue

            print(f"  [{i+1}/{len(pdf_emails)}] {date.date()} — {subject[:60]}")

            for att in msg.attachments:
                if not att.filename or not att.filename.lower().endswith(".pdf"):
                    continue

                pdf_bytes = att.payload
                print(f"    📄 {att.filename} ({len(pdf_bytes)//1024}KB)")

                # Extract
                data = extract_invoice(pdf_bytes)
                if not data:
                    errors.append({"subject": subject, "filename": att.filename})
                    continue

                ta_name_raw = data.get("ta_name") or ""
                ta_id = match_ta(ta_name_raw, profiles) if ta_name_raw else None
                confidence = "high" if ta_id and data.get("level") else ("medium" if ta_id else "low")

                print(f"    👤 {ta_name_raw} → {'matched ✓' if ta_id else 'NO MATCH ⚠'} | Level: {data.get('level')} | Days: {data.get('days')}")

                # Upload PDF
                safe_name = re.sub(r'[^a-zA-Z0-9._-]', '_', att.filename)
                date_prefix = date.strftime("%Y%m%d")
                pdf_url = upload_pdf(pdf_bytes, ta_id, f"{date_prefix}_{safe_name}")

                # Insert
                row = {
                    "ta_id":          ta_id,
                    "ta_name_raw":    ta_name_raw,
                    "invoice_date":   data.get("invoice_date"),
                    "project_name":   data.get("project_name"),
                    "school":         data.get("school"),
                    "days":           data.get("days"),
                    "level_invoiced": data.get("level"),
                    "daily_rate":     data.get("daily_rate"),
                    "total_amount":   data.get("total_amount"),
                    "invoice_number": data.get("invoice_number"),
                    "email_subject":  subject[:200],
                    "email_date":     date.isoformat(),
                    "pdf_filename":   att.filename,
                    "pdf_url":        pdf_url,
                    "confidence":     confidence,
                }
                supabase.table("ta_invoice_history").insert(row).execute()
                results.append({**row, "ta_name_raw": ta_name_raw})

            time.sleep(0.5)  # be gentle with Claude API

    # ── Summary report ───────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"✅ Scanned {len(results)} invoices")
    print(f"⚠  {len(errors)} extraction failures")

    # Discrepancy check
    qualifying = [r for r in results if (r.get("days") or 0) >= 3]
    qualifying.sort(key=lambda r: (r.get("ta_id") or "", r.get("invoice_date") or ""))

    # Group by TA
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
            calc_main = -(-n // 3)  # ceil(n/3)
            calc_sub  = ((n - 1) % 3) + 1
            calc_lvl  = float(f"{calc_main}.{calc_sub}")
            inv_lvl   = inv.get("level_invoiced")
            if inv_lvl and float(inv_lvl) != calc_lvl:
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
```

---

## Run it

```bash
python scan.py
```

Progress prints to terminal. Skips emails already scanned (safe to re-run).

---

## After running — check discrepancies in Supabase

```sql
-- All TAs with discrepancies
SELECT
  p.first_name || ' ' || p.last_name AS ta_name,
  p.email,
  COUNT(*) FILTER (WHERE h.days >= 3) AS qualifying_invoices,
  p.qualifying_projects AS portal_count,
  MIN(h.level_invoiced) AS lowest_level_invoiced,
  MAX(h.level_invoiced) AS highest_level_invoiced
FROM profiles p
JOIN ta_invoice_history h ON h.ta_id = p.id
WHERE p.role = 'ta'
GROUP BY p.id, p.first_name, p.last_name, p.email, p.qualifying_projects
ORDER BY ta_name;
```

```sql
-- Unmatched invoices (couldn't find the TA)
SELECT ta_name_raw, invoice_date, project_name, level_invoiced, pdf_url
FROM ta_invoice_history
WHERE ta_id IS NULL
ORDER BY invoice_date;
```

---

## Notes
- Gmail: enable IMAP in settings, create an App Password (not main password)
- Strato/other: use regular password, host is usually `imap.strato.de`
- Re-running is safe — duplicates are skipped based on email subject
- Low-confidence matches need manual review — check `WHERE confidence = 'low'`
- The `invoice-evidence` storage bucket needs to be created in Supabase Storage first (set to private)

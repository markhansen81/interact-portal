# TA Invoice Scanning Project

## Goal
Scan the InterACT invoices email inbox, extract all TA invoice data,
reconcile TAs with portal profiles, and populate historical project/level records.

## What we want out of it

1. **Per-TA project history** — every project over 3 days, with the level they invoiced at
2. **Starting level** — what level were they at when they started with us
3. **Evidence** — download invoice PDFs into Supabase Storage for audit trail
4. **Data table** — `ta_invoice_history` in Supabase (already created)

---

## Pay Scale Reference

| Level | Projects Required |
|-------|-------------------|
| 1.1   | 1                 |
| 1.2   | 2                 |
| 1.3   | 3                 |
| 2.1   | 4                 |
| 2.2   | 5                 |
| 2.3   | 6                 |
| 3.1   | 7                 |
| 3.2   | 8                 |
| 3.3   | 9                 |
| 4.1   | 10                |
| 4.2   | 11                |
| 4.3   | 12                |
| 5.1   | 13                |
| 5.2   | 14                |
| 5.3   | 15                |
| 6.1   | 16                |
| 6.2   | 17                |
| 6.3   | 18                |
| 7.1+  | 19+               |

---

## Database Tables (already created in Supabase)

### `ta_invoice_history`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| ta_id | uuid | FK to profiles (nullable until matched) |
| ta_name_raw | text | Name as written on invoice |
| invoice_date | date | Date on the invoice |
| project_name | text | Project / program name |
| school | text | School name |
| days | integer | Number of days worked |
| level_invoiced | numeric(4,1) | Level they wrote on the invoice |
| daily_rate | numeric | Daily rate charged |
| total_amount | numeric | Invoice total |
| invoice_number | text | Invoice reference number |
| email_subject | text | Email subject line |
| email_date | timestamptz | When email was received |
| pdf_filename | text | Original filename |
| pdf_url | text | Supabase Storage URL (if downloaded) |
| confidence | text | AI extraction quality: high/medium/low |
| notes | text | Any issues or flags |
| reviewed | boolean | Admin has checked this record |

### `pay_scale`
Already populated — level → projects_required mapping.

---

## Script Plan

### Step 1: Connect to email
```
- Protocol: IMAP (or Gmail API if using Gmail)
- Mailbox: invoices@interactenglish.de (or wherever invoices land)
- Filter: emails with PDF attachments, date range all-time
- Library: imaplib (Python) or imap-simple (Node)
```

### Step 2: Extract invoices
For each email with a PDF attachment:
- Download the PDF
- Send to Claude API (claude-opus-4-6) with prompt:
  ```
  Extract from this invoice:
  - TA full name
  - Invoice date
  - Invoice number
  - Project/program name
  - School name
  - Number of days worked
  - Pay level (e.g. 3.3) — they should have written this on the invoice
  - Daily rate
  - Total amount
  Return as JSON. If a field is not found, return null.
  ```
- Store extraction with confidence score

### Step 3: Match to portal profiles
```sql
SELECT id, first_name, last_name, email
FROM profiles WHERE role = 'ta'
```
- Fuzzy match `ta_name_raw` → profiles by name similarity
- Flag low-confidence matches for manual review

### Step 4: Upload PDFs to Supabase Storage
```
Bucket: invoice-evidence
Path: ta-invoices/{ta_id}/{invoice_date}_{invoice_number}.pdf
```
- Store the public/signed URL in `pdf_url`

### Step 5: Insert into `ta_invoice_history`
```sql
INSERT INTO ta_invoice_history (
  ta_id, ta_name_raw, invoice_date, project_name, school,
  days, level_invoiced, daily_rate, total_amount,
  invoice_number, email_subject, email_date,
  pdf_filename, pdf_url, confidence
) VALUES (...)
```

### Step 6: Reconcile levels (run after scan complete)
```sql
-- For each TA, find their earliest invoice to determine starting level
-- then count 3+ day projects to validate current level
SELECT
  p.id,
  p.first_name || ' ' || p.last_name AS name,
  p.qualifying_projects AS portal_qualifying,
  COUNT(h.id) FILTER (WHERE h.days >= 3) AS invoiced_qualifying,
  MIN(h.level_invoiced) AS starting_level,
  MAX(h.level_invoiced) AS latest_invoiced_level,
  p.pay_level AS current_portal_level
FROM profiles p
LEFT JOIN ta_invoice_history h ON h.ta_id = p.id
WHERE p.role = 'ta'
GROUP BY p.id, p.first_name, p.last_name, p.qualifying_projects, p.pay_level
ORDER BY name;
```

### Step 7: Update portal profiles
```sql
-- Update qualifying_projects count from invoice history
UPDATE profiles p SET
  qualifying_projects = (
    SELECT COUNT(*) FROM ta_invoice_history
    WHERE ta_id = p.id AND days >= 3
  )
WHERE role = 'ta';
```

---

## Supabase Connection
```
Project URL: (get from Supabase dashboard)
Service Role Key: (get from Supabase dashboard → Settings → API)
Storage Bucket: invoice-evidence (create this first)
```

## Output
After running, we'll have:
- All invoices in `ta_invoice_history` with PDFs stored
- Accurate `qualifying_projects` counts per TA
- Historical level progression with evidence (PDF URLs)
- Discrepancies flagged (portal level vs invoiced level)
- Admin can view in portal at `/admin/teaching-artists/{id}` — Generated Profile Documents section

---

## Claude API Prompt for PDF Extraction

```python
import anthropic, base64

client = anthropic.Anthropic(api_key="...")

def extract_invoice(pdf_bytes: bytes) -> dict:
    pdf_b64 = base64.standard_b64encode(pdf_bytes).decode()
    msg = client.messages.create(
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
                        "data": pdf_b64
                    }
                },
                {
                    "type": "text",
                    "text": """Extract the following from this Teaching Artist invoice and return as JSON:
{
  "ta_name": "full name",
  "invoice_number": "invoice ref",
  "invoice_date": "YYYY-MM-DD",
  "project_name": "program/project name",
  "school": "school name",
  "days": 5,
  "level": 3.3,
  "daily_rate": 150.00,
  "total_amount": 750.00
}
If a field is not found, use null. Days must be a number. Level should be like 1.1, 2.3, 3.3 etc."""
                }
            ]
        }]
    )
    import json, re
    text = msg.content[0].text
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        return json.loads(match.group())
    return {}
```

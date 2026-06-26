# Payroll Import (Tally → HR Portal) — Status & Decisions

**Last updated:** 2026-06-19
**Supersedes:** `tally_sync_walkthrough.md` and `tally_setup_guide.md` (those describe the live-API approach below, which was abandoned — kept for history only, not in use).

---

## Why this exists

We originally tried to have `tally_salary_push.py` connect live to Tally Prime's HTTP/ODBC gateway (port 9000) and pull payroll vouchers automatically every month. This was abandoned because:

- Tally is hosted by a third-party cloud provider (**HBS Solutions**, https://www.hbssolutions.in/) and accessed via a remote app client ("My Remote App"), not run locally.
- There is no network path to reach port 9000 on their server, and they were not asked yet whether they'd open it (still an option for later, see "Possible future path" below).
- Finance can, however, **export Tally reports as JSON/XML/CSV manually** from inside the remote session and send us the file.

**Decision:** build a manual file-import feature instead of a live API integration. Finance exports a file from Tally once a month; HR uploads it into the portal.

---

## Where this lives in the app

- **Backend:** `server/src/routes/salary.ts` — routes under `/api/salary/import/*`
  - `POST /import/preview` — parse file, match employees by `tallyLedgerName`, no DB writes.
  - `POST /import/commit` — writes encrypted `SalarySlip` rows; requires `overwrite=true` if the month already has data for a matched employee.
  - `GET /import/history` — audit log of past imports (`PayrollImportLog` table).
- **Parsing logic:** `server/src/utils/payrollImport.ts`
- **Frontend:** `frontend/src/components/PayrollImportPanel.tsx` (upload/preview/confirm UI), `PayrollImportHistory.tsx` (audit log table), wired into a tabbed `SalaryPage` in `Dashboard.tsx` (tabs: Import / History / My Salary, HR-only for the first two).
- **Encryption:** reuses the existing `server/src/utils/salarySecurity.ts` (AES-256-GCM). All salary figures are encrypted at rest exactly like the rest of the salary system — nothing new was introduced here.
- **Employee matching:** by `Employee.tallyLedgerName`, same field/concept as the old `tally_salary_push.py` script used (case-insensitive exact match).

All of the above is built, tested end-to-end, and working — **except the JSON column mapping**, see below.

---

## ⚠️ Open blocker: JSON column mapping is NOT done

### The problem

Finance's actual Tally export (`Pay Sheet.json`, a "Pay Sheet" report export) does **not** look like a list of named ledger entries. It looks like this (simplified):

```json
{
  "dsppaysheetdetails": {
    "dsppaysheetcatdetails": [
      {
        "namefield": "Primary Cost Category",
        "dsppaysheetamount": [ /* ~31 positional amount slots, no labels */ ],
        "dsppaysheetempdetails": {
          "dsppaysheetempdetails": [
            {
              "namefield": "GOURAV KUMAR",
              "dsppaysheetamount": [ /* same ~31 positional slots, per employee */ ]
            }
          ]
        }
      }
    ]
  }
}
```

Each employee has an **ordered array of ~31 amount slots** (`psheetpaidearn`, `psheetpaiddedn`, `psheetpaidearntotal`, `psheetpaiddedntotal`, `psheetpaidtotal`, and many empty `{}` placeholders for unused columns) — but **nothing in the file says which slot is Basic Salary, which is HRA, which is PF, etc.** The column order is defined by Tally's report configuration on the source system, which we don't have access to inspect directly.

Cross-referencing against the old script's known pay-head names (`EARNINGS_MAP` / `DEDUCTIONS_MAP` in `tally_salary_push.py`) doesn't resolve this safely: the sample file had **4 non-blank earning slots** but the script names **6** earnings, and **2 non-blank deduction slots** vs **4** named deductions. Guessing "first N non-blank = first N names" is exactly the kind of error that produces a wrong, mislabeled payslip PDF for a real employee — not acceptable.

### What's needed to unblock

Finance needs to export the **same Pay Sheet report** as **CSV or Excel** (Tally: open the report → **Alt+E** Export → format **CSV (Comma delimited)** or **Excel**), for the same employee/month as the JSON sample. CSV/Excel exports include the column header row, which JSON does not. Once we have that:

1. Read the header row → get the real column names in order.
2. Map each header to one of the existing canonical keys (`basicSalary`, `hra`, `da`, `ta`, `medicalAllowance`, `specialAllowance`, `pf`, `esi`, `tax`, `otherDeductions` — these field names are fixed, used by the DB/frontend, do not rename them).
3. Hard-code that position→key mapping in `server/src/utils/payrollImport.ts` (replacing the current placeholder ledger-name-based mapping, which assumes a different, unrelated Tally export shape — see below).
4. From then on, finance can keep exporting **JSON** every month as already planned — the CSV was only needed once, to learn the column order. (Re-verify if Tally's report layout ever changes.)

### Also fixed already (independent of the blocker)

- **File encoding bug**: Tally exports JSON/XML as **UTF-16 LE with a BOM** on Windows, not UTF-8. The importer now auto-detects and decodes UTF-16 LE/BE and UTF-8-BOM files correctly (see `decodeFileBuffer()` in `server/src/routes/salary.ts`). This was causing a silent 400 error on any real Tally export before the fix — confirmed fixed against the actual `Pay Sheet.json` sample.

### Current parser state (will need rework once headers are known)

`payrollImport.ts`'s `parsePayrollJson()` currently expects a generic `{ vouchers: [{ ledgerName, entries: [{ name, amount }] }] }` shape — this matches **neither** the real Pay Sheet JSON above **nor** the original XML voucher export the old Python script used. It was written before we'd seen a real export sample. **This function needs to be replaced** once the column mapping is known, to read the actual `dsppaysheetdetails.dsppaysheetcatdetails[].dsppaysheetempdetails.dsppaysheetempdetails[]` structure with the correct positional mapping.

The XML parser (`parsePayrollXml()`) was written against the old script's voucher/ledger XML shape and is untested against a real file — likely also needs revisiting once we know whether finance will ever export XML, or only JSON/CSV going forward.

---

## Possible future path (not pursued yet)

If HBS Solutions can be asked and agrees to open inbound access to port 9000 (or expose any API) for the hosted Tally instance, the original live-sync script (`tally_salary_push.py`) could be revived instead of/alongside manual import. Not actively being pursued — manual JSON import is the agreed path for now.

---

## Quick status summary

| Piece | Status |
|---|---|
| Preview endpoint (parse, match, no write) | ✅ Built & tested |
| Commit endpoint (encrypted write) | ✅ Built & tested |
| Overwrite confirmation (re-import same month) | ✅ Built & tested |
| Audit log (`PayrollImportLog` + History tab) | ✅ Built & tested |
| File encoding (UTF-16 LE from Tally) | ✅ Fixed & verified against real file |
| **JSON column → pay-head mapping** | ❌ **Blocked — waiting on CSV/Excel export with headers from finance** |
| Frontend tabbed Salary page (Import/History/My Salary) | ✅ Built |

# Salary Module — Implementation Plan
**Project:** Auto HR Portal — Autoform India  
**Prepared for:** Internal Review  
**Date:** May 2026  
**Status:** Pre-Development Review

---

## 1. Overview & Goals

The salary module will allow employees to securely view their own salary breakdowns and payslips directly through the HR Portal. The source of truth for all salary data will remain **Tally Prime** — the finance team continues to process salaries exactly as they do today. The HR Portal only reads and displays the final result.

### Core Principles
- Finance team has **full control** over salary processing — nothing changes for them
- Salary data is **end-to-end encrypted** — no one, including the developer, can read it from the database
- Every employee sees **only their own** salary — no hierarchy-based sharing, no manager access
- **No open ports** or permanent connections between Tally and the internet
- The integration uses a **push model** — a local script on the finance machine sends data to the portal

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────┐
│              COMPANY INTERNAL NETWORK               │
│                                                     │
│   ┌──────────────┐     ┌──────────────────────┐    │
│   │  Tally Prime │────▶│  Local Push Script   │    │
│   │  (localhost) │     │  (finance machine)   │    │
│   └──────────────┘     └──────────┬───────────┘    │
│                                   │ HTTPS POST      │
└───────────────────────────────────┼─────────────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   HR Portal Server   │
                         │  (public internet)   │
                         │                      │
                         │  Receives & encrypts │
                         │  Stores in database  │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │      Employees       │
                         │  (browser / portal)  │
                         │  View own payslip    │
                         └──────────────────────┘
```

---

## 3. Tally Prime Prerequisites

The following must be configured on the **finance team's machine** before any integration can work.

| Requirement | Details |
|-------------|---------|
| **Tally Prime version** | Confirm version in use (Prime 2.x recommended) |
| **HTTP Server enabled** | F12 → Advanced Configuration → Enable Tally Gateway Server |
| **Default port** | `9000` (localhost only, not exposed to internet) |
| **Payroll module** | Must be active and licensed in Tally |
| **Company loaded** | The correct company file must be open when the script runs |
| **Python or Node.js** | Must be installed on the finance machine to run the push script |
| **Internet access** | Finance machine needs outbound HTTPS access to the HR Portal server |

---

## 4. Employee Mapping

Not all employees need to be connected to Tally. The system is **opt-in per employee**.

### How It Works
Each employee record in the HR Portal will have an optional field:

```
tallyLedgerName: "John Smith"
```

- If this field is set → the employee's salary is fetched from Tally on sync
- If this field is blank → the employee is skipped entirely

### Who Sets This?
HR sets the `tallyLedgerName` once per employee when onboarding them to the salary module. The name must exactly match how the employee appears in Tally's payroll ledger.

### Benefits
- Employees not on the portal payroll are never touched
- Some employees may be on a different payroll system — they are simply not mapped
- HR has full control over who is included

---

## 5. The Local Push Script

A script runs on the **finance team's machine**, on the same local network as Tally Prime.

### Trigger Method
The script is **manually triggered** by the finance team on salary day. It is not an automated scheduler on the server — this is intentional for control and security.

Optionally, it can also be set up as a **Windows Scheduled Task** to run on a specific date each month (e.g., always on the 5th of the month at 10 AM).

### What the Script Does

```
Step 1 → Calls HR Portal API to get list of employees with tallyLedgerName set
Step 2 → For each employee, queries Tally via XML API (localhost:9000)
Step 3 → Extracts full salary breakdown from Tally payroll voucher
Step 4 → Structures the data as JSON
Step 5 → Posts encrypted-ready payload to HR Portal import API over HTTPS
Step 6 → Logs success/failure per employee to a local log file
```

### Data Extracted Per Employee from Tally

```
EARNINGS (all salary heads configured in Tally payroll)
  - Basic Salary
  - HRA
  - DA
  - TA
  - Special Allowance
  - Incentive (if any)
  - Any other custom earnings heads

DEDUCTIONS (all deduction heads configured in Tally payroll)
  - PF (Provident Fund)
  - ESI
  - TDS / Tax
  - Leave Deduction (calculated by finance)
  - Any other custom deduction heads

TOTALS
  - Gross Salary
  - Total Deductions
  - Net Payable

ATTENDANCE (from Tally payroll voucher)
  - Working Days
  - Days Present
  - Month (YYYY-MM)
```

### Authentication
The script authenticates to the HR Portal using a **dedicated server-to-server API key** (not a user login token). This key is stored in the script's local config file on the finance machine and is separate from all user credentials.

---

## 6. Data Encryption

This is the most critical security requirement. **Salary figures are encrypted before being stored in the database.** No one with database access — including the developer — can read the actual numbers.

### Algorithm
**AES-256-GCM** (industry standard, built into Node.js `crypto` module — no extra dependencies)

### What Is Encrypted

| Field | Encrypted |
|-------|-----------|
| Gross Salary | ✅ Yes |
| Total Deductions | ✅ Yes |
| Net Salary | ✅ Yes |
| Full Breakdown JSON (all heads) | ✅ Yes |
| Month | ❌ No (needed for database queries) |
| Employee ID | ❌ No (needed for database queries) |
| Working Days / Days Present | ❌ No (non-sensitive) |

### Encryption Key
- Stored **only** in the server's `.env` file as `SALARY_ENCRYPTION_KEY`
- Never committed to Git or any version control
- Generated once and stored securely by the client (Autoform India IT/admin)
- If the key is lost, historical salary data cannot be recovered — **backup the key securely**

### What an Attacker or Developer Sees in the Database
```
grossSalary: "U2FsdGVkX1+mN8rVx3K2pHs7dQpXz=="  (meaningless)
breakdownJson: "A7fGt2....(long encrypted string)..."  (meaningless)
```

### Decryption
Happens **only at request time**, only for the authenticated employee requesting their own data. The decrypted values are never stored anywhere — they live only in server memory for the duration of the response.

---

## 7. Access Control Rules

This module intentionally breaks from the hierarchy-based access model used in other modules (attendance, leaves, performance).

### Salary Visibility

| Role | Can View | Whose Data |
|------|----------|------------|
| EMPLOYEE | ✅ Yes | Own only |
| MANAGER | ✅ Yes | Own only |
| HR | ✅ Yes | Own only |
| LEADERSHIP | ✅ Yes | Own only |

**No exceptions. No manager sees team salary. No HR sees employee salary. No developer sees anyone's salary.**

### API Enforcement
The backend salary route will enforce:
```
Request is only allowed if employeeId in the request == employeeId of the logged-in user
```

Even if someone crafts a manual API call with another employee's ID, it will be rejected with a 403 Forbidden error.

The only exception is the **import endpoint**, which accepts data only from the server-to-server API key and never from user JWT tokens.

---

## 8. Server API Endpoints

### New Endpoints Required

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/salary/my/breakdown` | Self only | Get own current salary breakdown |
| `GET` | `/api/salary/my/slips` | Self only | Get list of own payslips |
| `GET` | `/api/salary/my/slips/:month` | Self only | Get one specific payslip |
| `POST` | `/api/salary/import` | API Key only | Receive salary data from Tally script |
| `GET` | `/api/salary/mapped-employees` | API Key only | List employees with tallyLedgerName set |

### Modified Endpoints
The existing `/api/salary/breakdown/:employeeId` and `/api/salary/slips/:employeeId` routes will be restricted to self-only access.

---

## 9. Database Changes

### Employee Table
Add one new optional field:

```
tallyLedgerName   VARCHAR(200)   nullable   default null
```

### SalarySlip Table
The existing `SalarySlip` model fields will now store encrypted values:

```
grossSalary      → stored as encrypted string (currently Decimal)
totalDeductions  → stored as encrypted string
netSalary        → stored as encrypted string
breakdownJson    → stored as encrypted string (already LongText, good)
```

> **Note:** The schema column types will change from `Decimal` to `Text` for the encrypted fields. This requires a database migration.

---

## 10. Frontend Changes

### Dashboard — Salary Tab
Simple self-only view. No employee list or team selection.

```
┌──────────────────────────────────────────────┐
│  My Salary                        May 2026 ▼ │
├──────────────────────────────────────────────┤
│  CURRENT BREAKDOWN                           │
│  ┌────────────────┬────────────────┐         │
│  │ EARNINGS       │ DEDUCTIONS     │         │
│  │ Basic  ₹X,XXX  │ PF    ₹X,XXX  │         │
│  │ HRA    ₹X,XXX  │ ESI     ₹XXX  │         │
│  │ ...            │ ...           │         │
│  ├────────────────┼────────────────┤         │
│  │ Gross ₹XX,XXX  │ Total  ₹X,XXX │         │
│  └────────────────┴────────────────┘         │
│              NET: ₹XX,XXX                    │
├──────────────────────────────────────────────┤
│  PAST PAYSLIPS                               │
│  May 2026   ₹XX,XXX net   [View Payslip]    │
│  Apr 2026   ₹XX,XXX net   [View Payslip]    │
│  Mar 2026   ₹XX,XXX net   [View Payslip]    │
└──────────────────────────────────────────────┘
```

### Payslip Modal (View & Print)
Opens as a modal with a print-ready format. Uses browser's native print-to-PDF — no extra library required.

```
┌────────────────────────────────────────────────────┐
│  [Company Logo]          AUTOFORM INDIA            │
│                          SALARY SLIP               │
│                          May 2026                  │
├─────────────────────┬──────────────────────────────┤
│  Name: John Smith   │  Department: Engineering     │
│  Employee ID: 042   │  Designation: Sr. Engineer   │
│  Working Days: 26   │  Days Present: 25            │
├─────────────────────┴──────────────────────────────┤
│  EARNINGS                   DEDUCTIONS             │
│  Basic Salary    ₹25,000    PF            ₹3,000  │
│  HRA             ₹10,000    ESI             ₹500  │
│  DA               ₹2,500    TDS           ₹1,200  │
│  Special Allow.   ₹3,000    Leave Dedn.     ₹960  │
│  Incentive        ₹5,000                          │
├─────────────────────────────────────────────────── │
│  Gross:          ₹45,500    Total Dedn:   ₹5,660  │
├────────────────────────────────────────────────────┤
│                 NET PAYABLE: ₹39,840               │
│          This is a computer generated slip         │
└────────────────────────────────────────────────────┘
                [Print / Download PDF]  [Close]
```

### Profile Page — Salary Tab
Same self-only view. When viewing another employee's profile, the **Salary tab is not shown at all**.

### Employee Edit Form (HR Only)
Add a field: **Tally Ledger Name** — optional text field HR fills in to link the employee to Tally.

---

## 11. The Local Push Script — Technical Spec

**Language:** Python 3.x (recommended) or Node.js  
**Location:** Finance team's machine (same machine as Tally Prime)  
**Config file:** `config.json` stored locally (contains API key and HR Portal URL)

### Script Flow (Pseudocode)
```
1. Load config (HR Portal URL, API key)
2. GET /api/salary/mapped-employees → get list of {employeeId, tallyLedgerName}
3. For each employee:
   a. POST to localhost:9000 with Tally XML request for that ledger + target month
   b. Parse XML response → extract all earnings and deduction heads
   c. Calculate gross, total deductions, net pay
   d. POST to /api/salary/import with structured JSON + API key header
   e. Log result (success / error) to local log file
4. Print summary: X employees synced, Y failed
```

### Error Handling
- If Tally is closed → script exits with clear error message
- If one employee fails → continues with the rest, logs the failure
- If the HR Portal is unreachable → logs error, retries 3 times

---

## 12. Security Summary

| Concern | Solution |
|---------|---------|
| Open port to Tally | ❌ None — push model, script runs inside company network |
| Database readable by developer | AES-256-GCM encryption, key held by client |
| One employee seeing another's salary | Backend enforces self-only at API level |
| Script authentication | Dedicated server-to-server API key, not a user account |
| Key management | `SALARY_ENCRYPTION_KEY` in server `.env`, never in Git |
| Accidental data exposure | Salary tab hidden when viewing other profiles |

---

## 13. Implementation Phases

### Phase 1 — Backend Foundation
- Add `tallyLedgerName` to Employee model
- Build encrypted `SalarySlip` storage (schema migration)
- Build self-only salary API endpoints
- Build import endpoint with API key authentication
- Build `mapped-employees` endpoint for the script

### Phase 2 — Frontend
- Salary tab on Dashboard (self-only view)
- Payslip modal with print layout
- Hide salary tab on other employees' profiles
- Add Tally Ledger Name field to employee edit form (HR only)

### Phase 3 — Local Push Script
- Write and test the Python script
- Test against a Tally sandbox/test company
- Deploy to finance team machine
- Document usage instructions for finance team

### Phase 4 — Testing & Handover
- End-to-end test with real Tally data (test company)
- Verify encryption (confirm DB shows only gibberish)
- Verify access control (confirm cross-employee access is blocked)
- Hand over encryption key management to client

---

## 14. Open Questions for Colleague Review

> [!IMPORTANT]
> The following questions should be answered before development begins.

1. **Tally Version** — Which exact version of Tally Prime is the finance team running? (Check Help → About in Tally)

2. **Payroll Module** — Is the Tally Payroll module active and is payroll currently processed through Tally?

3. **Salary Heads** — What are the exact earnings and deduction heads used in Tally? (e.g., is it called "Basic Salary" or "Basic Pay"?) The script needs to know the exact names.

4. **Employee Code in Tally** — Does Tally have an employee code/ID, or are employees identified only by name? An employee code would make matching more reliable.

5. **Encryption Key Custodian** — Who at Autoform India will hold and manage the `SALARY_ENCRYPTION_KEY`? This person must back it up securely.

6. **Script Trigger** — Should the script be manually run by finance, or set up as a Windows Scheduled Task on a fixed date each month?

7. **Payslip Branding** — What should appear on the payslip? Company logo, address, any footer text?

8. **Email Notification** — Should employees receive an email when their payslip is ready? (Optional cron job on server)

9. **Historical Data** — Should past salary slips (before this system) be uploaded manually or via Excel? Or start fresh from the go-live month?

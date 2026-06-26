# Tally & HR Portal Salary Sync — Complete Setup Guide
**Project:** Auto HR Portal — Autoform India  
**Target Audience:** HR Portal Developers (Internal IT) & Finance/Payroll Team  

---

## 📋 Overview
This document covers the end-to-end setup required to securely synchronize processed salaries from **Tally Prime** (on the finance machine) to the **HR Portal** (on the cloud).

```
┌─────────────────────────────────┐         HTTPS POST         ┌────────────────────────┐
│     FINANCE MACHINE (LOCAL)     │   ──────────────────────>  │   HR PORTAL (SERVER)   │
│  Tally Prime ──▶ Push Script    │    (Server-to-Server Key)  │  Encrypts & Saves data │
└─────────────────────────────────┘                            └────────────────────────┘
```

---

## Part 1 — Server & Developer Setup ("Here")

### 1. Configure Server Environment Variables
On the server hosting the HR Portal, open your production/staging `.env` file and configure the two keys:

```env
# Salary / Payroll Integration Settings
SALARY_API_KEY="sk_salary_a2df98c3b4e65012f718bc94a50d2e81"
SALARY_ENCRYPTION_KEY="sek_encrypt_e762c451da81cf7390ab258162f901cb"
```

> [!WARNING]  
> * Keep the `SALARY_ENCRYPTION_KEY` backed up securely. If it is lost or changed, historical salary slips cannot be decrypted and will be unreadable.
> * The `SALARY_API_KEY` is a secret server-to-server token. Keep it private.

### 2. Map Employees in the HR Portal
Before any employee's payroll data can be synced, the database needs to know which employee on the portal corresponds to which ledger name in Tally.

1. Log into the HR Portal as **HR/Admin**.
2. Go to the employee's profile and click **Edit Profile**.
3. Under the payroll/salary fields, find the **Tally Ledger Name** field.
4. Enter the exact name of the employee as it appears in Tally's payroll ledger (e.g., `John Smith`).
5. **Save** changes.

> 💡 *Only employees with a populated `Tally Ledger Name` field will be imported by the script. Unmapped employees are safely skipped.*

---

## Part 2 — Finance Team Machine Setup ("There")

### Step 1 — Prepare the Sync Directory
Create a dedicated folder on the finance machine:
* Recommended location: `C:\TallySalarySync\`

Move the following two files into this folder:
1. `tally_salary_push.py`
2. `config.json`

### Step 2 — Configure Tally HTTP/ODBC Server
The sync script communicates with Tally Prime locally over HTTP.
1. Open **Tally Prime**.
2. Press **F12** (Configure) or go to **F1: Help > Settings > Connectivity**.
3. Go to **Advanced Configuration** / **Client/Server Configuration**.
4. Set **Enable ODBC Server** / **Tally Gateway Server** to **Yes**.
5. Set the Port to **9000** (default).
6. **Accept & Save** settings, then **Restart Tally Prime**.

### Step 3 — Install Python on the Finance Machine
1. Download Python 3.8+ (version 3.12 recommended) from [python.org](https://www.python.org/downloads/).
2. Run the installer.
3. **CRITICAL:** Check the box that says **"Add Python to PATH"** on the first screen.
4. Click **Install Now**.
5. When complete, open a Command Prompt (`cmd`) and verify:
   ```cmd
   python --version
   ```

### Step 4 — Install the HTTP requests Library
Open Command Prompt and install the required request handler:
```cmd
pip install requests
```

### Step 5 — Set Config Parameters
Open `C:\TallySalarySync\config.json` in Notepad. It is pre-filled for local development but must be updated for production deployment:

```json
{
  "TALLY_URL": "http://localhost:9000",
  "HR_PORTAL_URL": "https://your-live-hr-portal.com",
  "HR_PORTAL_API_KEY": "sk_salary_a2df98c3b4e65012f718bc94a50d2e81"
}
```

* **`TALLY_URL`**: Keep as `http://localhost:9000` unless IT changed Tally's port.
* **`HR_PORTAL_URL`**: Change to the live domain of the HR Portal (no trailing slash).
* **`HR_PORTAL_API_KEY`**: Set to the exact key matching `SALARY_API_KEY` in the server's `.env`.

### Step 6 — Map Pay Heads in the Script (One-Time)
Different companies name earnings and deductions differently in Tally. Open `tally_salary_push.py` in Notepad and locate `EARNINGS_MAP` and `DEDUCTIONS_MAP` (starts around line 28):

```python
EARNINGS_MAP = {
    "basicSalary":      "Basic Salary",          # Change right side to match your Tally Pay Head Name
    "hra":               "House Rent Allowance",
    "da":                "Dearness Allowance",
    "ta":                "Transport Allowance",
    "medicalAllowance":  "Medical Allowance",
    "specialAllowance":  "Special Allowance",
}

DEDUCTIONS_MAP = {
    "pf":               "Provident Fund",        # Change right side to match your Tally Pay Head Name
    "esi":              "ESI",
    "tax":              "Professional Tax",
    "otherDeductions":  "Salary Advance / Deductions",
}
```
* **Left-Hand Side** keys (e.g. `"basicSalary"`): **Do not modify**. These correspond to database structure.
* **Right-Hand Side** values (e.g. `"Basic Salary"`): Change these to match the **exact names** of the Pay Heads configured in your Tally Prime company.

---

## Part 3 — Monthly Synchronization Routine (Finance Team)

Every month after processing salaries in Tally Prime, perform these steps to sync data:

1. **Open Tally Prime** and load the company file.
2. Confirm payroll vouchers are saved and finalized for the target month.
3. Open **Command Prompt** and navigate to your sync folder:
   ```cmd
   cd C:\TallySalarySync
   ```
4. Run the script with the year and month you wish to sync (format: `YYYY-MM`):
   ```cmd
   python tally_salary_push.py --month 2026-06
   ```
5. Observe the console output. When the sync completes, it will display:
   ```
   ============================================================
   SYNC COMPLETE  |  Month: 2026-06
   ✅ Success : 12
   ⏭  Skipped : 0
   ❌ Failed  : 0
   ============================================================
   ```
6. **Logs:** A `sync_log.txt` file is generated inside the directory after every run for auditing.

---

## 🔍 Troubleshooting

| Issue / Error | Cause | Resolution |
|---|---|---|
| `"Cannot connect to Tally..."` | Tally is closed or port 9000 server is disabled. | Open Tally Prime, load the active company, and verify F12 gateway settings. |
| `Gross salary is 0` warning | Right-hand side names in `EARNINGS_MAP` don't match Tally pay heads. | Match spelling, capitalization, and spaces in `tally_salary_push.py` with Tally's Pay Heads. |
| `⏭ Skipped` employees | Employee has no payroll voucher recorded in Tally for the specified month. | Check if salary voucher was processed for this employee in Tally Prime. |
| `❌ Failed: HR Portal rejected data` | Wrong API key or invalid formatting. | Verify the API keys in `config.json` and the server `.env` match exactly. |
| `The 'requests' library is not installed` | Missing dependency on finance machine. | Run `pip install requests` in command prompt. |

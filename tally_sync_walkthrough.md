# Tally Salary Sync Script — Setup & Usage Guide
**For:** Finance Team / IT Setup  
**Project:** Auto HR Portal — Autoform India  
**Script:** `tally_salary_push.py`

---

## What This Script Does

On salary day, after the finance team has fully processed the month's salary in Tally Prime (including leave deductions and incentives), this script is run **once** on the finance team's machine. It:

1. Reads salary data from Tally for all linked employees
2. Sends the salary slips to the HR Portal automatically
3. Employees can then log in and view/print their own payslip

The script runs in under a minute. It does not modify anything in Tally.

---

## Files You Will Receive

Put all of these in **one folder** on the finance machine (e.g., `C:\TallySalarySync\`):

```
C:\TallySalarySync\
    tally_salary_push.py    ← the main script
    config.json             ← your settings (you fill this in)
```

After the first run, a `sync_log.txt` file will appear in the same folder — this is the run history log.

---

## Part 1 — One-Time Setup (Done Once by IT)

### Step 1 — Enable Tally HTTP Server

This allows the script to talk to Tally locally. It does **not** expose Tally to the internet.

1. Open **Tally Prime**
2. Press **F12** (Configure)
3. Go to **Advanced Configuration**
4. Find **"Enable ODBC Server"** (or **"Tally Gateway Server"** depending on version)
5. Set it to **Yes**
6. Port should be **9000** (leave as default)
7. **Accept / Save**
8. Restart Tally Prime

> ✅ You only need to do this once. The setting is saved permanently.

---

### Step 2 — Install Python

1. Go to [https://www.python.org/downloads/](https://www.python.org/downloads/)
2. Download **Python 3.12** (or any 3.8+ version)
3. Run the installer
4. **IMPORTANT:** On the first installer screen, tick **"Add Python to PATH"**
5. Click **Install Now**
6. When done, click **Close**

**Verify it worked:** Open Command Prompt (press Windows key, type `cmd`, press Enter) and type:
```
python --version
```
You should see something like `Python 3.12.0`. If you do, Python is installed correctly.

---

### Step 3 — Install the Required Library

Open Command Prompt and run:
```
pip install requests
```

Wait for it to finish. You will see `Successfully installed requests-...` when done.

> ✅ You only need to do this once.

---

### Step 4 — Fill In the Config File

Open the file `config.json` in **Notepad** (right-click → Open with → Notepad).

It looks like this:

```json
{
    "TALLY_URL": "http://localhost:9000",
    "HR_PORTAL_URL": "https://your-hr-portal.com",
    "HR_PORTAL_API_KEY": "PASTE_YOUR_API_KEY_HERE"
}
```

**Fill in the values:**

| Variable | What to Enter |
|----------|---------------|
| `TALLY_URL` | Leave as `http://localhost:9000` unless IT has changed Tally's port |
| `HR_PORTAL_URL` | The full URL of the HR Portal (your developer will give you this) |
| `HR_PORTAL_API_KEY` | The secret API key (your developer will give you this — keep it private) |

**Example after filling in:**
```json
{
    "TALLY_URL": "http://localhost:9000",
    "HR_PORTAL_URL": "https://hr.autoformindia.com",
    "HR_PORTAL_API_KEY": "sk_live_abc123xyz456..."
}
```

Save the file (Ctrl + S), close Notepad.

> ⚠️ **Keep `config.json` private.** Do not email it or share it. It contains a secret key.

---

### Step 5 — Configure Pay Head Names in the Script

This is the **most important setup step**. The script needs to know the exact names of your salary components as they appear in Tally.

Open `tally_salary_push.py` in Notepad. Scroll to find this section:

```python
EARNINGS_MAP = {
    "basicSalary":      "Basic Salary",
    "hra":               "House Rent Allowance",
    "da":                "Dearness Allowance",
    ...
}

DEDUCTIONS_MAP = {
    "pf":               "Provident Fund",
    "esi":              "ESI",
    ...
}
```

The **left-hand side** keys (like `"basicSalary"`, `"hra"`, `"pf"`) are required by the database and frontend and must **not** be renamed.
The **right-hand side** values (like `"Basic Salary"`, `"House Rent Allowance"`, `"Provident Fund"`) must match **exactly** how the pay heads are named in Tally.

**How to check names in Tally:**  
Gateway of Tally → Payroll → Pay Heads → list all pay heads and note the exact names.

Edit the script to match your Tally pay heads. For example, if your Tally uses `"HRA"` instead of `"House Rent Allowance"`:

```python
"hra": "HRA",   # change the right side to match Tally exactly
```

Save the file when done.

> ✅ You only need to do this once (unless pay heads change in Tally).

---

### Step 6 — Map Employees in the HR Portal

For each employee whose salary should be synced:

1. Log into the HR Portal as **HR**
2. Open the employee's profile
3. Click **Edit Profile**
4. Find the field **"Tally Ledger Name"**
5. Enter the employee's name **exactly as it appears in Tally payroll**
6. Save

> Only employees with this field filled in will be synced. Others are skipped.

---

## Part 2 — Running the Script (Every Month)

### Before You Run

✅ Tally Prime is open  
✅ The correct company is loaded in Tally  
✅ Salary for the month is fully processed in Tally  
✅ The finance machine is connected to the internet  

---

### How to Run

1. Open **Command Prompt** (press Windows key, type `cmd`, press Enter)

2. Navigate to the script folder:
```
cd C:\TallySalarySync
```

3. Run the script with the month you want to sync:
```
python tally_salary_push.py --month 2026-06
```

Replace `2026-06` with the correct year and month (format is always `YYYY-MM`).

4. The script will print output showing what it is doing:

```
2026-06-18 10:00:01  INFO     ============================================================
2026-06-18 10:00:01  INFO       Tally Salary Sync  |  Month: 2026-06
2026-06-18 10:00:01  INFO     ============================================================
2026-06-18 10:00:02  INFO     Fetching mapped employees from HR Portal...
2026-06-18 10:00:02  INFO     Found 12 mapped employee(s). Starting sync...
2026-06-18 10:00:02  INFO       Processing: John Smith (Portal ID: 5, Tally: 'John Smith')
2026-06-18 10:00:03  INFO       ↳ Found: Gross ₹45,500.00 | Deductions ₹5,660.00 | Net ₹39,840.00
2026-06-18 10:00:03  INFO       ↳ ✅ Pushed successfully to HR Portal
2026-06-18 10:00:03  INFO       Processing: Priya Sharma (Portal ID: 8, Tally: 'Priya Sharma')
...
2026-06-18 10:00:15  INFO     ============================================================
2026-06-18 10:00:15  INFO       SYNC COMPLETE  |  Month: 2026-06
2026-06-18 10:00:15  INFO       ✅ Success : 12
2026-06-18 10:00:15  INFO       ⏭  Skipped : 0
2026-06-18 10:00:15  INFO       ❌ Failed  : 0
2026-06-18 10:00:15  INFO     ============================================================
```

5. When it says **SYNC COMPLETE** with 0 failures, you are done. Employees can now log in to the HR Portal and view their payslip.

---

## Part 3 — Understanding the Output

| Symbol | Meaning |
|--------|---------|
| ✅ | Salary slip pushed to HR Portal successfully |
| ⏭ Skipped | Employee has a Tally name set but no payroll voucher found in Tally for this month. Check if salary was processed for them in Tally. |
| ❌ Failed | Data was found in Tally but something went wrong sending it to the HR Portal. Check your internet connection and the log file. |

---

## Part 4 — The Log File

Every time the script runs, it adds entries to `sync_log.txt` in the same folder. If something goes wrong, open this file and look at the last few lines for the error message.

You can open it in Notepad at any time to review past runs.

---

## Part 5 — Troubleshooting

### "Cannot connect to Tally"
- Make sure Tally Prime is **open** on this machine
- Make sure the **correct company** is loaded
- Make sure the Tally HTTP server is enabled (Step 1 in setup)
- Try opening a browser and going to `http://localhost:9000` — if you see any response, Tally is running. If the page doesn't load, Tally's server is off.

### "No payroll voucher found" for an employee
- Check that the employee's salary was fully processed and saved in Tally for that month
- Check that the **Tally Ledger Name** in the HR Portal matches the employee's name in Tally **exactly** (spelling, spaces, capitalisation)

### "Gross salary is 0" warning
- The script connected to Tally and found a voucher, but couldn't find any earnings
- The pay head names in the script's `EARNINGS_MAP` don't match what Tally uses
- Re-check Step 5 of the setup — verify the exact pay head names in Tally

### "HR Portal rejected data"
- The API key in `config.json` may be wrong — contact your developer
- The HR Portal server may be down — contact your developer

### Script runs but employees still can't see their slip
- Confirm the month format is correct (`YYYY-MM`, not `MM-YYYY`)
- Confirm the employee is mapped in the HR Portal (has a Tally Ledger Name set)
- Employees should log out and log back in, then check the Salary tab

---

## Part 6 — Variables Reference

| Variable / Setting | Where | Description |
|--------------------|-------|-------------|
| `TALLY_URL` | `config.json` | URL of Tally's local HTTP server. Default: `http://localhost:9000`. Change only if IT has configured a different port. |
| `HR_PORTAL_URL` | `config.json` | The full HTTPS URL of your HR Portal. Provided by developer. Do not add a trailing slash. |
| `HR_PORTAL_API_KEY` | `config.json` | Secret key to authenticate with the HR Portal import API. Provided by developer. Keep private. |
| `EARNINGS_MAP` | Script file | Maps your internal labels to Tally's exact pay head names for earnings. Edit once to match your Tally setup. |
| `DEDUCTIONS_MAP` | Script file | Same as above but for deduction heads. |
| `--month` | Command line | The month to sync, always in `YYYY-MM` format. You pass this every time you run the script. |

---

## Quick Reference Card

```
Every salary day — run this:

1.  Open Tally Prime → load the company → confirm salary is processed
2.  Open Command Prompt
3.  cd C:\TallySalarySync
4.  python tally_salary_push.py --month YYYY-MM
5.  Wait for SYNC COMPLETE message
6.  Done — employees can view their payslips
```

---

*For any issues with the script or HR Portal, contact your developer.*  
*Do not share `config.json` or the API key with anyone outside of IT.*

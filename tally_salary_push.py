#!/usr/bin/env python3
"""
Tally Salary Sync Script - Auto HR Portal
Queries payroll data from Tally Prime local HTTP API and syncs to the HR Portal.
"""

import os
import sys
import json
import logging
import argparse
import calendar
import xml.etree.ElementTree as ET
from datetime import datetime

# Configure Logging
log_filename = "sync_log.txt"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s %(message)s",
    handlers=[
        logging.FileHandler(log_filename, encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ]
)

# Mappings of backend database field names to Tally Pay Head names.
# The keys correspond to the fields expected by the HR Portal backend.
# The values are the exact names of the Pay Heads as they exist in Tally Prime.
EARNINGS_MAP = {
    "basicSalary":      "Basic Salary",
    "hra":               "House Rent Allowance",
    "da":                "Dearness Allowance",
    "ta":                "Conveyance Allowance",
    "medicalAllowance":  "Medical Allowance",
    "specialAllowance":  "Special Allowance",
}

DEDUCTIONS_MAP = {
    "pf":               "Provident Fund",
    "esi":              "ESI",
    "tax":              "TDS On Salary",
    "otherDeductions":  "Salary Advance / Deductions",
}

def get_month_dates(month_str):
    """
    Given YYYY-MM, returns the start and end date of the month in YYYYMMDD format
    needed by Tally.
    """
    try:
        year, month = map(int, month_str.split("-"))
        _, last_day = calendar.monthrange(year, month)
        start_date = f"{year:04d}{month:02d}01"
        end_date = f"{year:04d}{month:02d}{last_day:02d}"
        return start_date, end_date, last_day
    except Exception as e:
        raise ValueError(f"Invalid month format: {month_str}. Must be YYYY-MM.") from e

def build_tally_xml_request(start_date, end_date):
    """
    Generates the XML Export envelope payload for Tally.
    This requests Tally to export payroll-related vouchers for the specified period.
    """
    xml_str = f"""<ENVELOPE>
    <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>VoucherCollection</ID>
    </HEADER>
    <BODY>
        <DESC>
            <STATICVARIABLES>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                <SVFROMDATE TYPE="Date">{start_date}</SVFROMDATE>
                <SVTODATE TYPE="Date">{end_date}</SVTODATE>
            </STATICVARIABLES>
            <TDL>
                <TDLMESSAGE>
                    <COLLECTION NAME="VoucherCollection" ISMODIFY="No">
                        <TYPE>Voucher</TYPE>
                        <FILTER>IsPayrollVoucher</FILTER>
                        <FETCH>*</FETCH>
                    </COLLECTION>
                    <SYSTEM TYPE="Formulae" NAME="IsPayrollVoucher">$VoucherTypeName = "Payroll"</SYSTEM>
                </TDLMESSAGE>
            </TDL>
        </DESC>
    </BODY>
</ENVELOPE>"""
    return xml_str

def find_tag_value(element, tag_name):
    """
    Helper to search for an element tag ending with tag_name (ignores namespaces).
    """
    for el in element.iter():
        if el.tag.split("}")[-1] == tag_name:
            return el.text
    return None

def extract_ledger_entries(voucher_element):
    """
    Extracts all ledger entries from a Tally voucher.
    Returns list of dicts with {ledger_name, amount}.
    """
    entries = []
    # Find all ALLLEDGERENTRIES.LIST elements (namespace insensitive)
    for el in voucher_element.iter():
        tag = el.tag.split("}")[-1]
        if tag == "ALLLEDGERENTRIES.LIST":
            ledger_name = find_tag_value(el, "LEDGERNAME")
            amount_str = find_tag_value(el, "AMOUNT")
            if ledger_name and amount_str:
                try:
                    # Tally credit amounts are usually negative, we keep absolute value for computation
                    amount = abs(float(amount_str))
                    entries.append({
                        "name": ledger_name,
                        "amount": amount
                    })
                except ValueError:
                    pass
    return entries

def match_voucher_for_employee(vouchers, tally_ledger_name):
    """
    Checks if a voucher corresponds to the employee's ledger name.
    """
    for v in vouchers:
        # Check PARTYNAME or PARTYLEDGERNAME first
        party = find_tag_value(v, "PARTYNAME") or find_tag_value(v, "PARTYLEDGERNAME")
        if party and party.strip().lower() == tally_ledger_name.strip().lower():
            return v
        
        # Fallback: check if the employee's ledger name is one of the ledger entries inside the voucher
        ledger_entries = extract_ledger_entries(v)
        for entry in ledger_entries:
            if entry["name"].strip().lower() == tally_ledger_name.strip().lower():
                return v
    return None

def main():
    parser = argparse.ArgumentParser(description="Sync Tally payroll data to the HR Portal.")
    parser.add_argument(
        "--month", 
        required=True, 
        help="The month to sync in YYYY-MM format (e.g., 2026-06)"
    )
    args = parser.parse_args()
    
    month = args.month
    logging.info("=" * 60)
    logging.info(f"Tally Salary Sync  |  Month: {month}")
    logging.info("=" * 60)
    
    # 1. Load config
    config_file = "config.json"
    if not os.path.exists(config_file):
        logging.error("Config file config.json not found. Run setup first.")
        sys.exit(1)
        
    with open(config_file, "r") as f:
        config = json.load(f)
        
    tally_url = config.get("TALLY_URL", "http://localhost:9000")
    hr_portal_url = config.get("HR_PORTAL_URL", "").rstrip("/")
    api_key = config.get("HR_PORTAL_API_KEY", "")
    
    if not hr_portal_url or not api_key:
        logging.error("HR_PORTAL_URL or HR_PORTAL_API_KEY is missing in config.json")
        sys.exit(1)
        
    # 2. Get Dates
    try:
        start_date, end_date, total_days = get_month_dates(month)
    except ValueError as e:
        logging.error(str(e))
        sys.exit(1)
        
    # Lazy import requests to ensure users get error messages if missing
    try:
        import requests
    except ImportError:
        logging.error("The 'requests' library is not installed. Please run: pip install requests")
        sys.exit(1)
        
    # 3. Fetch mapped employees from HR Portal
    logging.info("Fetching mapped employees from HR Portal...")
    employees_endpoint = f"{hr_portal_url}/api/salary/mapped-employees"
    headers = {
        "x-salary-api-key": api_key,
        "Content-Type": "application/json"
    }
    
    try:
        res = requests.get(employees_endpoint, headers=headers, timeout=15)
        res.raise_for_status()
        res_data = res.json()
        employees = res_data.get("data", {}).get("employees", [])
    except Exception as e:
        logging.error(f"Failed to fetch mapped employees from HR Portal: {e}")
        sys.exit(1)
        
    if not employees:
        logging.info("No mapped employees found on HR Portal. Sync finished.")
        sys.exit(0)
        
    logging.info(f"Found {len(employees)} mapped employee(s). Starting sync...")
    
    # 4. Fetch payroll vouchers from Tally
    logging.info(f"Connecting to Tally Prime at {tally_url}...")
    xml_request = build_tally_xml_request(start_date, end_date)
    
    try:
        tally_res = requests.post(tally_url, data=xml_request, headers={"Content-Type": "text/xml"}, timeout=10)
        tally_res.raise_for_status()
        tally_xml = tally_res.content
    except Exception as e:
        logging.error(f"Cannot connect to Tally. Ensure Tally Prime is open and ODBC/Gateway server is running. Error: {e}")
        sys.exit(1)
        
    # 5. Parse Tally XML Vouchers
    try:
        root = ET.fromstring(tally_xml)
        # Find all VOUCHER elements namespace-insensitively
        vouchers = []
        for el in root.iter():
            tag = el.tag.split("}")[-1]
            if tag == "VOUCHER":
                vouchers.append(el)
    except Exception as e:
        logging.error(f"Failed to parse XML response from Tally: {e}")
        sys.exit(1)
        
    success_count = 0
    skipped_count = 0
    failed_count = 0
    
    # 6. Process each employee
    for emp in employees:
        emp_id = emp["employeeId"]
        name = emp["name"]
        tally_ledger_name = emp["tallyLedgerName"]
        
        logging.info(f"Processing: {name} (Portal ID: {emp_id}, Tally Ledger: '{tally_ledger_name}')")
        
        # Match Tally voucher
        voucher = match_voucher_for_employee(vouchers, tally_ledger_name)
        if voucher is None:
            logging.info(f"  ↳ ⏭  Skipped: No payroll voucher found in Tally for '{tally_ledger_name}' this month.")
            skipped_count += 1
            continue
            
        # Extract ledger entries
        ledger_entries = extract_ledger_entries(voucher)
        
        # Map values
        earnings = {}
        deductions = {}
        net_salary_from_tally = 0.0
        
        # Populate breakdown matching mapped ledgers
        for entry in ledger_entries:
            ledger_name_lower = entry["name"].strip().lower()
            
            # Check if this entry is the employee ledger itself (holds net salary)
            if ledger_name_lower == tally_ledger_name.strip().lower():
                net_salary_from_tally = entry["amount"]
                continue
                
            # Check Earnings Map
            matched_earning_key = None
            for key, val in EARNINGS_MAP.items():
                if val.strip().lower() == ledger_name_lower:
                    matched_earning_key = key
                    break
            if matched_earning_key:
                earnings[matched_earning_key] = entry["amount"]
                continue
                
            # Check Deductions Map
            matched_deduction_key = None
            for key, val in DEDUCTIONS_MAP.items():
                if val.strip().lower() == ledger_name_lower:
                    matched_deduction_key = key
                    break
            if matched_deduction_key:
                deductions[matched_deduction_key] = entry["amount"]
                continue
        
        gross_salary = sum(earnings.values())
        total_deductions = sum(deductions.values())
        net_salary = gross_salary - total_deductions
        
        # If net salary was directly extracted, use it if calculation is zero (fallback)
        if net_salary == 0 and net_salary_from_tally > 0:
            net_salary = net_salary_from_tally
            
        if gross_salary == 0:
            logging.warning(f"  ↳ ⚠️  Gross salary is 0. Verify pay head names in script EARNINGS_MAP match Tally.")
            
        # Parse attendance from Tally voucher if available
        # Default: full present days matching total calendar days of the month
        working_days = total_days
        days_present = total_days
        
        # Look for attendance in voucher (e.g. ATTENDANCEENTRIES.LIST or similar UDFs)
        # Since attendance structure varies, we try a fallback extraction
        for el in voucher.iter():
            tag = el.tag.split("}")[-1]
            if tag == "ATTENDANCEENTRIES.LIST":
                val_str = find_tag_value(el, "VAL")
                if val_str:
                    try:
                        days_present = int(float(val_str))
                    except ValueError:
                        pass
        
        # Build breakdown JSON payload for the import API
        breakdown_payload = {}
        for key in EARNINGS_MAP.keys():
            breakdown_payload[key] = earnings.get(key, 0.0)
        for key in DEDUCTIONS_MAP.keys():
            breakdown_payload[key] = deductions.get(key, 0.0)
            
        import_payload = {
            "employeeId": emp_id,
            "month": month,
            "workingDays": working_days,
            "daysPresent": days_present,
            "grossSalary": gross_salary,
            "totalDeductions": total_deductions,
            "netSalary": net_salary,
            "breakdownJson": breakdown_payload
        }
        
        # Post import
        import_endpoint = f"{hr_portal_url}/api/salary/import"
        try:
            post_res = requests.post(import_endpoint, json=import_payload, headers=headers, timeout=15)
            if post_res.status_code == 200:
                logging.info(f"  ↳ ✅ Pushed successfully to HR Portal (Gross: ₹{gross_salary:,.2f} | Deductions: ₹{total_deductions:,.2f} | Net: ₹{net_salary:,.2f})")
                success_count += 1
            else:
                logging.error(f"  ↳ ❌ Failed: HR Portal rejected data. Code: {post_res.status_code}, Msg: {post_res.text}")
                failed_count += 1
        except Exception as e:
            logging.error(f"  ↳ ❌ Failed: Cannot connect to HR Portal: {e}")
            failed_count += 1
            
    logging.info("=" * 60)
    logging.info(f"SYNC COMPLETE  |  Month: {month}")
    logging.info(f"✅ Success : {success_count}")
    logging.info(f"⏭  Skipped : {skipped_count}")
    logging.info(f"❌ Failed  : {failed_count}")
    logging.info("=" * 60)

if __name__ == "__main__":
    main()

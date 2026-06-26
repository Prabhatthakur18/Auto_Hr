import xml2js from 'xml2js';
import xlsx from 'xlsx';

export interface PayLineItem {
    label: string;
    amount: number;
}

export interface ParsedEmployeePaysheet {
    employeeLabel: string;
    earnings: PayLineItem[];
    deductions: PayLineItem[];
    grossSalary: number;
    totalDeductions: number;
    netSalary: number;
}

/**
 * Keyword rules used to classify a pay-head column as an earning or a
 * deduction, since real Tally exports use free-form column names (e.g.
 * "EMPLOYEE'S ESI DEDUCTION @0.75%") rather than a fixed, known set.
 * Checked in order; first match wins. Anything matching neither list,
 * and not a recognized total/net column, is treated as an unclassified
 * earning-side line item (safer default than silently dropping data).
 */
const DEDUCTION_KEYWORDS = [
    'deduction', 'epf', 'pf ', ' pf', 'esi', 'tds', 'tax', 'loan', 'advance',
    'insurance', 'gratuity', 'recovery', 'penalty', 'fine',
];

const TOTAL_EARNINGS_KEYWORDS = ['total earning', 'gross'];
const TOTAL_DEDUCTIONS_KEYWORDS = ['total deduction'];
const NET_AMOUNT_KEYWORDS = ['net amount', 'net salary', 'net pay'];
const IGNORED_COLUMN_KEYWORDS = ['particulars'];

type ColumnKind = 'EARNING' | 'DEDUCTION' | 'TOTAL_EARNINGS' | 'TOTAL_DEDUCTIONS' | 'NET_AMOUNT' | 'IGNORED';

function classifyColumn(header: string): ColumnKind {
    const lower = header.trim().toLowerCase();
    if (IGNORED_COLUMN_KEYWORDS.some((k) => lower.includes(k))) return 'IGNORED';
    if (NET_AMOUNT_KEYWORDS.some((k) => lower.includes(k))) return 'NET_AMOUNT';
    if (TOTAL_DEDUCTIONS_KEYWORDS.some((k) => lower.includes(k))) return 'TOTAL_DEDUCTIONS';
    if (TOTAL_EARNINGS_KEYWORDS.some((k) => lower.includes(k))) return 'TOTAL_EARNINGS';
    if (DEDUCTION_KEYWORDS.some((k) => lower.includes(k))) return 'DEDUCTION';
    return 'EARNING';
}

/**
 * Builds per-employee pay sheets from a header row + data rows, where the
 * header row gives the real pay-head name for each column position and
 * each data row is one employee. Only columns with a nonzero value for
 * that employee are included (matches the variable pay-head pattern where
 * different employees have different allowances/deductions filled in).
 */
function buildPaysheetsFromRows(headerRow: unknown[], dataRows: unknown[][]): ParsedEmployeePaysheet[] {
    const columns = headerRow.map((h, i) => ({
        index: i,
        header: String(h ?? '').trim(),
        kind: classifyColumn(String(h ?? '')),
    })).filter((c) => c.header && c.kind !== 'IGNORED');

    const results: ParsedEmployeePaysheet[] = [];

    for (const row of dataRows) {
        const employeeLabel = String(row[0] ?? '').trim();
        if (!employeeLabel) continue;
        // Skip aggregate rows that aren't real employees
        if (/^(grand total|total|primary cost category)$/i.test(employeeLabel)) continue;

        const earnings: PayLineItem[] = [];
        const deductions: PayLineItem[] = [];
        let grossFromSheet: number | null = null;
        let deductionsFromSheet: number | null = null;
        let netFromSheet: number | null = null;

        for (const col of columns) {
            if (col.index === 0) continue; // employee label column itself
            const raw = row[col.index];
            const amount = Number(raw);
            if (raw === null || raw === undefined || raw === '' || Number.isNaN(amount) || amount === 0) continue;

            switch (col.kind) {
                case 'EARNING':
                    earnings.push({ label: col.header, amount });
                    break;
                case 'DEDUCTION':
                    deductions.push({ label: col.header, amount });
                    break;
                case 'TOTAL_EARNINGS':
                    grossFromSheet = amount;
                    break;
                case 'TOTAL_DEDUCTIONS':
                    deductionsFromSheet = amount;
                    break;
                case 'NET_AMOUNT':
                    netFromSheet = amount;
                    break;
            }
        }

        const computedGross = earnings.reduce((sum, e) => sum + e.amount, 0);
        const computedDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);

        results.push({
            employeeLabel,
            earnings,
            deductions,
            grossSalary: grossFromSheet ?? computedGross,
            totalDeductions: deductionsFromSheet ?? computedDeductions,
            netSalary: netFromSheet ?? (computedGross - computedDeductions),
        });
    }

    return results;
}

export interface ParsedPayrollResult {
    paysheets: ParsedEmployeePaysheet[];
    /** The pay period detected in the sheet (e.g. "2026-05"), if found. */
    detectedMonth: string | null;
}

const MONTH_ABBR: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

/**
 * Extracts a YYYY-MM month from a Tally date-range string like
 * "1-May-26 to 31-May-26" or "1-May-2026 to 31-May-2026".
 */
function detectMonthFromPeriodText(text: string): string | null {
    const match = text.match(/-([A-Za-z]{3})-(\d{2,4})/);
    if (!match) return null;

    const monthAbbr = match[1]!.toLowerCase();
    const monthNum = MONTH_ABBR[monthAbbr];
    if (!monthNum) return null;

    let year = match[2]!;
    if (year.length === 2) year = `20${year}`;

    return `${year}-${monthNum}`;
}

/**
 * Parses a Tally "Pay Sheet" XLSX export. The sheet has a few header rows
 * (company name/address, pay period), then a "Particulars" row that is the
 * real column header, then one data row per employee plus aggregate rows.
 */
export function parsePayrollXlsx(buffer: Buffer): ParsedPayrollResult {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { paysheets: [], detectedMonth: null };

    const sheet = workbook.Sheets[sheetName]!;
    const rows = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });

    const headerRowIndex = rows.findIndex(
        (row) => String(row[0] ?? '').trim().toLowerCase() === 'particulars'
    );
    if (headerRowIndex === -1) {
        throw new Error('Could not find the "Particulars" header row in this Pay Sheet export');
    }

    // The pay period (e.g. "1-May-26 to 31-May-26") appears in one of the
    // rows above the header row — scan all of them for a date-range pattern.
    let detectedMonth: string | null = null;
    for (let i = 0; i < headerRowIndex; i++) {
        const cellText = String(rows[i]?.[0] ?? '');
        const found = detectMonthFromPeriodText(cellText);
        if (found) {
            detectedMonth = found;
            break;
        }
    }

    const headerRow = rows[headerRowIndex]!;
    const dataRows = rows.slice(headerRowIndex + 1);

    return { paysheets: buildPaysheetsFromRows(headerRow, dataRows), detectedMonth };
}

/**
 * Parses a Tally "Pay Sheet" JSON export — the same report as the XLSX
 * above, but without column headers (Tally's JSON export omits them).
 * Since the column order matches the XLSX for the same report, callers
 * should prefer the XLSX format when available; this JSON path uses a
 * permissive generic fallback shape for any other JSON export structure.
 */
export function parsePayrollJson(raw: string): ParsedEmployeePaysheet[] {
    const parsed = JSON.parse(raw);

    // Generic fallback shape: { vouchers: [{ ledgerName, entries: [{name, amount}] }] }
    const list: unknown[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as any)?.vouchers)
            ? (parsed as any).vouchers
            : Array.isArray((parsed as any)?.data)
                ? (parsed as any).data
                : [];

    if (list.length === 0) {
        throw new Error(
            'This JSON file is not in a recognized format. Export the Pay Sheet as XLSX instead — it includes column headers needed to read pay-head names correctly.'
        );
    }

    return list.map((item): ParsedEmployeePaysheet => {
        const voucher = item as Record<string, unknown>;
        const employeeLabel = String(
            voucher.ledgerName ?? voucher.partyName ?? voucher.PARTYNAME ?? voucher.party ?? ''
        ).trim();

        const rawEntries = Array.isArray(voucher.entries)
            ? voucher.entries
            : Array.isArray(voucher.ledgerEntries)
                ? voucher.ledgerEntries
                : [];

        const earnings: PayLineItem[] = [];
        const deductions: PayLineItem[] = [];

        for (const e of rawEntries as unknown[]) {
            const entry = e as Record<string, unknown>;
            const name = String(entry.name ?? entry.ledgerName ?? entry.LEDGERNAME ?? '').trim();
            const amount = Math.abs(Number(entry.amount ?? entry.AMOUNT));
            if (!name || Number.isNaN(amount) || amount === 0) continue;
            if (name.trim().toLowerCase() === employeeLabel.toLowerCase()) continue;

            if (classifyColumn(name) === 'DEDUCTION') {
                deductions.push({ label: name, amount });
            } else {
                earnings.push({ label: name, amount });
            }
        }

        const grossSalary = earnings.reduce((sum, e) => sum + e.amount, 0);
        const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);

        return {
            employeeLabel,
            earnings,
            deductions,
            grossSalary,
            totalDeductions,
            netSalary: grossSalary - totalDeductions,
        };
    }).filter((p) => p.employeeLabel);
}

/**
 * Parses a Tally XML payroll export (VOUCHER/ALLLEDGERENTRIES.LIST shape).
 */
export async function parsePayrollXml(raw: string): Promise<ParsedEmployeePaysheet[]> {
    const result = await xml2js.parseStringPromise(raw, { explicitArray: true, tagNameProcessors: [stripNamespace] });

    const paysheets: ParsedEmployeePaysheet[] = [];
    const voucherNodes = findAllByTag(result, 'VOUCHER');

    for (const node of voucherNodes) {
        const employeeLabel = String(
            firstValue(node, 'PARTYNAME') ?? firstValue(node, 'PARTYLEDGERNAME') ?? ''
        ).trim();
        if (!employeeLabel) continue;

        const earnings: PayLineItem[] = [];
        const deductions: PayLineItem[] = [];
        const ledgerEntryNodes = findAllByTag(node, 'ALLLEDGERENTRIES.LIST');

        for (const entryNode of ledgerEntryNodes) {
            const name = String(firstValue(entryNode, 'LEDGERNAME') ?? '').trim();
            const amount = Math.abs(Number(firstValue(entryNode, 'AMOUNT')));
            if (!name || Number.isNaN(amount) || amount === 0) continue;
            if (name.trim().toLowerCase() === employeeLabel.toLowerCase()) continue;

            if (classifyColumn(name) === 'DEDUCTION') {
                deductions.push({ label: name, amount });
            } else {
                earnings.push({ label: name, amount });
            }
        }

        const grossSalary = earnings.reduce((sum, e) => sum + e.amount, 0);
        const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);

        paysheets.push({
            employeeLabel,
            earnings,
            deductions,
            grossSalary,
            totalDeductions,
            netSalary: grossSalary - totalDeductions,
        });
    }

    return paysheets;
}

function stripNamespace(tag: string): string {
    return tag.split(':').pop() ?? tag;
}

function findAllByTag(node: unknown, tag: string, found: any[] = []): any[] {
    if (Array.isArray(node)) {
        for (const item of node) findAllByTag(item, tag, found);
    } else if (node && typeof node === 'object') {
        for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
            if (key === tag) {
                if (Array.isArray(value)) found.push(...value);
                else found.push(value);
            }
            findAllByTag(value, tag, found);
        }
    }
    return found;
}

function firstValue(node: unknown, tag: string): string | undefined {
    const matches = findAllByTag(node, tag);
    if (matches.length === 0) return undefined;
    const value = matches[0];
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    if (value && typeof value === 'object' && '_' in value) return String((value as any)._);
    return undefined;
}

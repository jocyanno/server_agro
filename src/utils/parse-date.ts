import { parse, isValid } from "date-fns";

// Excel (Windows) epoch: 1899-12-31; Unix epoch offset in days:
const EXCEL_EPOCH_OFFSET = 25569; // days between 1899-12-31 and 1970-01-01
const DAY_MS = 24 * 60 * 60 * 1000;

export function parseCemadenDate(input: number | string): Date {
  // 1) Excel serial: number (may contain fractional part for time-of-day)
  if (typeof input === "number" && Number.isFinite(input)) {
    const ms = (input - EXCEL_EPOCH_OFFSET) * DAY_MS;
    return new Date(ms); // interpreted as UTC milliseconds since epoch
  }

  // 2) String formats you showed earlier
  if (typeof input === "string") {
    // try "yyyy-MM-dd HH:mm:ss.S" and "yyyy-MM-dd HH:mm:ss"
    for (const fmt of ["yyyy-MM-dd HH:mm:ss.S", "yyyy-MM-dd HH:mm:ss"]) {
      const d = parse(input, fmt, new Date());
      if (isValid(d)) return d;
    }
    // fallback: ISO-ish
    const iso = input.includes(" ") ? input.replace(" ", "T") : input;
    const d = new Date(iso);
    if (isValid(d)) return d;
  }

  throw new Error(`Unrecognized date value: ${String(input)}`);
}
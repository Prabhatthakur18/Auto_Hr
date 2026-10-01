/**
 * Short leave: 2 hours at the start ("Morning") or end ("Evening") of a working day.
 * One per calendar month, not carried forward, single day, no paid-quota usage.
 * Mirrors server/src/utils/leaveRules.ts — the server enforces the rules.
 */
export const SHORT_LEAVE_MORNING = 'Short Leave (Morning)';
export const SHORT_LEAVE_EVENING = 'Short Leave (Evening)';
export const SHORT_LEAVE_HOURS = 2;
export const SHORT_LEAVES_PER_MONTH = 1;

/** Office-time window each short leave covers. */
export const SHORT_LEAVE_WINDOWS: Record<string, string> = {
  [SHORT_LEAVE_MORNING]: '9:30–11:30 AM',
  [SHORT_LEAVE_EVENING]: '4:00–6:00 PM',
};

export function isShortLeave(type: string | null | undefined): boolean {
  return type === SHORT_LEAVE_MORNING || type === SHORT_LEAVE_EVENING;
}

/** "2 hrs" for a short leave, otherwise "N day(s)". */
export function formatLeaveDuration(leave: { type: string; days: number }): string {
  if (isShortLeave(leave.type)) return `${SHORT_LEAVE_HOURS} hrs`;
  return `${leave.days} ${leave.days === 1 ? 'day' : 'days'}`;
}

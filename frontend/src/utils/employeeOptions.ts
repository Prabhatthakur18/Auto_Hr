/**
 * Standard values for the employee Department and Employee Type fields.
 * Used by every form that sets them, so the data stays consistent for filters,
 * reports, announcement targeting and access rules (e.g. Accounts payroll access).
 */

export const DEPARTMENTS = [
  'Accounts & Finance',
  'Administration',
  'Engineering',
  'HR',
  'Maintenance',
  'Operations',
  'Production',
  'Purchase',
  'Quality',
  'Sales & Marketing',
  'Stores',
  'Tech',
] as const;

export const EMPLOYEE_TYPES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Probation',
  'Trainee',
  'Intern',
  'Consultant',
] as const;

/**
 * Options for a dropdown, keeping a record's existing non-standard value selectable
 * (labelled "(current)") so opening an old profile never silently drops its data.
 */
export function optionsWithCurrent(
  standard: readonly string[],
  current: string | null | undefined
): { value: string; label: string }[] {
  const options = standard.map(value => ({ value, label: value }));
  if (current && !standard.includes(current)) {
    options.push({ value: current, label: `${current} (current)` });
  }
  return options;
}

// Internal / owner addresses that must never enter a send cohort or skew
// analytics. Maintained as an explicit list (add new variants here) so the
// exclusion survives every future cohort — a single source of truth for the
// "this is us, not a real lead" check.
export const INTERNAL_EMAILS = [
  "cohen.benjacob@gmail.com",
  "benjacobcohen00@gmail.com",
];

/**
 * SQL fragment that is TRUE when the column is NOT an internal address.
 * `col` is a trusted column reference (e.g. "l.email"), never user input.
 */
export function notInternalEmailSql(col: string): string {
  const list = INTERNAL_EMAILS.map((e) => `'${e.replace(/'/g, "''")}'`).join(", ");
  return `${col} NOT IN (${list})`;
}

export function isInternalEmail(email: string): boolean {
  return INTERNAL_EMAILS.includes(email.trim().toLowerCase());
}

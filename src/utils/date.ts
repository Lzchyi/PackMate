/**
 * Formats a date range according to the following rules:
 * - Same month: DD-DD/MM/YY (e.g., 12-15/03/26)
 * - Different month, same year: DD/MM - DD/MM/YY (e.g., 28/03 - 02/04/26)
 * - Different year: DD/MM/YY - DD/MM/YY (e.g., 28/12/25 - 02/01/26)
 * 
 * @param startDateStr ISO date string (YYYY-MM-DD)
 * @param endDateStr ISO date string (YYYY-MM-DD)
 * @returns Formatted date range string
 */
export function formatDateRange(startDateStr: string, endDateStr: string): string {
  if (!startDateStr || !endDateStr) return '';

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';

  const startDay = start.getDate().toString().padStart(2, '0');
  const startMonth = (start.getMonth() + 1).toString().padStart(2, '0');
  const startYear = start.getFullYear().toString().slice(-2);

  const endDay = end.getDate().toString().padStart(2, '0');
  const endMonth = (end.getMonth() + 1).toString().padStart(2, '0');
  const endYear = end.getFullYear().toString().slice(-2);

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) {
    return `${startDay}-${endDay}/${endMonth}/${endYear}`;
  }

  if (sameYear) {
    return `${startDay}/${startMonth} - ${endDay}/${endMonth}/${endYear}`;
  }

  return `${startDay}/${startMonth}/${startYear} - ${endDay}/${endMonth}/${endYear}`;
}

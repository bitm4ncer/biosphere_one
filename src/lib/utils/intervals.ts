import { addDays, formatISO, isAfter, parseISO } from "date-fns";

export interface DateInterval {
  from: string;
  to: string;
  index: number;
}

export function buildIntervals(
  startDate: string,
  endDate: string,
  intervalDays: number,
): DateInterval[] {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const result: DateInterval[] = [];
  let cursor = start;
  let index = 0;

  while (!isAfter(cursor, end)) {
    const next = addDays(cursor, intervalDays);
    const to = isAfter(next, end) ? end : next;
    result.push({
      from: formatISO(cursor, { representation: "complete" }),
      to: formatISO(to, { representation: "complete" }),
      index,
    });
    cursor = next;
    index += 1;
  }

  return result;
}

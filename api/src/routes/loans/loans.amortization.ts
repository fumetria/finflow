// French amortization schedule (fixed installment).
//
// Pure, DB-independent: given the loan terms it returns the full table of
// installments. All money math is done in integer cents to avoid floating
// point drift; the rounding remainder is absorbed by the last installment so
// the outstanding balance closes at exactly 0.00.
//
// Dates are computed in UTC (same rule as recurring_rules) so each dueDate is a
// timezone-independent calendar date, not shifted by the server's local offset.

export interface AmortizationInput {
  principal: number; // capital borrowed, in currency units (e.g. 12000.00)
  annualRate: number; // nominal annual rate as a percentage (e.g. 7.5 for 7.5%)
  termMonths: number; // number of installments
  startDate: Date; // due date of the first installment (number 1)
}

export interface ScheduleEntry {
  number: number; // 1..termMonths
  dueDate: Date;
  amount: number; // total installment (principal + interest)
  principalComponent: number;
  interestComponent: number;
  remainingBalance: number; // outstanding principal after paying this installment
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

// Add `months` to a UTC calendar date, clamping the day to the target month's
// last day (e.g. Jan 31 + 1 month → Feb 28/29).
function addMonthsUTC(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const targetMonthIndex = month + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const clampedDay = Math.min(day, lastDayOfMonth(targetYear, targetMonth));
  return new Date(Date.UTC(targetYear, targetMonth, clampedDay));
}

const toCents = (units: number) => Math.round(units * 100);
const toUnits = (cents: number) => cents / 100;

export function buildAmortizationSchedule(input: AmortizationInput): ScheduleEntry[] {
  const { principal, annualRate, termMonths, startDate } = input;

  if (!Number.isInteger(termMonths) || termMonths <= 0) {
    throw new Error('termMonths must be a positive integer');
  }
  if (principal <= 0) {
    throw new Error('principal must be greater than 0');
  }
  if (annualRate < 0) {
    throw new Error('annualRate must be greater than or equal to 0');
  }

  const monthlyRate = annualRate / 100 / 12;
  const principalCents = toCents(principal);

  // Fixed installment. With zero interest it's simply the principal split evenly.
  const installmentCents =
    monthlyRate === 0
      ? Math.round(principalCents / termMonths)
      : Math.round((principalCents * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths)));

  const schedule: ScheduleEntry[] = [];
  let balanceCents = principalCents;

  for (let n = 1; n <= termMonths; n++) {
    const isLast = n === termMonths;
    const interestCents = Math.round(balanceCents * monthlyRate);

    let principalPartCents: number;
    let amountCents: number;

    if (isLast) {
      // Absorb the rounding remainder: pay off whatever principal is left.
      principalPartCents = balanceCents;
      amountCents = balanceCents + interestCents;
    } else {
      principalPartCents = installmentCents - interestCents;
      amountCents = installmentCents;
    }

    balanceCents -= principalPartCents;

    schedule.push({
      number: n,
      dueDate: addMonthsUTC(startDate, n - 1),
      amount: toUnits(amountCents),
      principalComponent: toUnits(principalPartCents),
      interestComponent: toUnits(interestCents),
      remainingBalance: toUnits(balanceCents),
    });
  }

  return schedule;
}

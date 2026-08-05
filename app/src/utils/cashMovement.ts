import type {
  CashDailySummary,
  CashMovement,
} from '../types/cashMovement'

const BUSINESS_TIME_ZONE = 'America/Mexico_City'

export function getBusinessDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  )

  return `${values.year}-${values.month}-${values.day}`
}

export function resolveCashBusinessDate(
  currentDate: string,
  requestedDate: string | null,
  allowOverride: boolean,
): string {
  return allowOverride && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate ?? '')
    ? requestedDate!
    : currentDate
}

export function calculateCashDailySummary(
  movements: readonly CashMovement[],
  openingBalanceCents = 0,
): CashDailySummary {
  const summary: CashDailySummary = {
    openingBalanceCents,
    cashIncomeCents: 0,
    electronicIncomeCents: 0,
    expenseCents: 0,
    withdrawalCents: 0,
    totalOutflowCents: 0,
    estimatedCashCents: 0,
  }

  for (const movement of movements) {
    if (movement.type === 'income') {
      if (movement.paymentMethod === 'cash') {
        summary.cashIncomeCents += movement.amountCents
      } else {
        summary.electronicIncomeCents += movement.amountCents
      }
    } else if (movement.type === 'expense') {
      summary.expenseCents += movement.amountCents
    } else {
      summary.withdrawalCents += movement.amountCents
    }
  }

  summary.totalOutflowCents =
    summary.expenseCents + summary.withdrawalCents
  summary.estimatedCashCents =
    openingBalanceCents +
    summary.cashIncomeCents -
    summary.totalOutflowCents

  return summary
}

export function calculateAccumulatedCashDailySummary(
  movements: readonly CashMovement[],
  businessDate: string,
  initialBalanceCents: number,
): CashDailySummary {
  const openingBalanceCents = calculateCashDailySummary(
    movements.filter(
      (movement) => movement.businessDate < businessDate,
    ),
    initialBalanceCents,
  ).estimatedCashCents

  return calculateCashDailySummary(
    movements.filter(
      (movement) => movement.businessDate === businessDate,
    ),
    openingBalanceCents,
  )
}

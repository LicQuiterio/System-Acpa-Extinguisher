const MIN_CANCELLATION_REASON_LENGTH = 10
const MAX_CANCELLATION_REASON_LENGTH = 500

export function normalizeSalesNoteCancellationReason(
  reason: string,
): string {
  const normalizedReason = reason.trim()

  if (
    normalizedReason.length <
    MIN_CANCELLATION_REASON_LENGTH
  ) {
    throw new Error(
      'Explica el motivo de cancelación con al menos 10 caracteres',
    )
  }

  if (
    normalizedReason.length >
    MAX_CANCELLATION_REASON_LENGTH
  ) {
    throw new Error(
      'El motivo de cancelación no puede superar 500 caracteres',
    )
  }

  return normalizedReason
}
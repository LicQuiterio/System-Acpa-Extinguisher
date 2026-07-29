const MIN_RESCHEDULING_REASON_LENGTH = 10
const MAX_RESCHEDULING_REASON_LENGTH = 500

export function normalizeSalesNoteReschedulingReason(
  reason: string,
): string {
  const normalizedReason = reason.trim()

  if (
    normalizedReason.length <
    MIN_RESCHEDULING_REASON_LENGTH
  ) {
    throw new Error(
      'Explica el motivo de la reprogramación con al menos 10 caracteres',
    )
  }

  if (
    normalizedReason.length >
    MAX_RESCHEDULING_REASON_LENGTH
  ) {
    throw new Error(
      'El motivo de la reprogramación no puede superar 500 caracteres',
    )
  }

  return normalizedReason
}
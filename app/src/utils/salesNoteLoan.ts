import {
  CAPACITY_UNITS,
  EXTINGUISHER_AGENTS,
} from '../constants/sales'
import {
  EMPTY_SALES_NOTE_LOAN_SUMMARY,
  MAX_EQUIPMENT_CODE_LENGTH,
  MAX_LOAN_CONDITION_LENGTH,
  MAX_LOAN_RETURN_NOTES_LENGTH,
  SALES_NOTE_LOAN_REASONS,
} from '../constants/salesNoteLoans'
import type {
  RegisterSalesNoteLoanInput,
  SalesNoteLoanSummary,
} from '../types/salesNoteLoan'

const allowedReasons = new Set<string>(
  SALES_NOTE_LOAN_REASONS.map(
    (reason) => reason.value,
  ),
)

const allowedAgents = new Set<string>(
  EXTINGUISHER_AGENTS.map(
    (agent) => agent.value,
  ),
)

const allowedCapacityUnits = new Set<string>(
  CAPACITY_UNITS.map(
    (unit) => unit.value,
  ),
)

export function normalizeLoanEquipmentCode(
  equipmentCode: string,
): string {
  const normalizedCode = equipmentCode
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!normalizedCode) {
    throw new Error(
      'El código del equipo es obligatorio',
    )
  }

  if (
    normalizedCode.length >
    MAX_EQUIPMENT_CODE_LENGTH
  ) {
    throw new Error(
      `El código del equipo no puede superar ${MAX_EQUIPMENT_CODE_LENGTH} caracteres`,
    )
  }

  return normalizedCode
}

export function normalizeLoanOutgoingCondition(
  condition: string,
): string {
  const normalizedCondition = condition.trim()

  if (!normalizedCondition) {
    throw new Error(
      'La condición de salida es obligatoria',
    )
  }

  if (
    normalizedCondition.length >
    MAX_LOAN_CONDITION_LENGTH
  ) {
    throw new Error(
      `La condición de salida no puede superar ${MAX_LOAN_CONDITION_LENGTH} caracteres`,
    )
  }

  return normalizedCondition
}

export function normalizeLoanReturnNotes(
  notes: string,
): string {
  const normalizedNotes = notes.trim()

  if (
    normalizedNotes.length >
    MAX_LOAN_RETURN_NOTES_LENGTH
  ) {
    throw new Error(
      `Las observaciones de devolución no pueden superar ${MAX_LOAN_RETURN_NOTES_LENGTH} caracteres`,
    )
  }

  return normalizedNotes
}

export function normalizeSalesNoteLoanInput(
  input: RegisterSalesNoteLoanInput,
): RegisterSalesNoteLoanInput & {
  normalizedEquipmentCode: string
} {
  if (!allowedReasons.has(input.reason)) {
    throw new Error(
      'El motivo del préstamo no es válido',
    )
  }

  if (!allowedAgents.has(input.agent)) {
    throw new Error(
      'El agente del extintor no es válido',
    )
  }

  if (
    !Number.isFinite(input.capacityValue) ||
    input.capacityValue <= 0
  ) {
    throw new Error(
      'La capacidad debe ser mayor que cero',
    )
  }

  if (
    !allowedCapacityUnits.has(input.capacityUnit)
  ) {
    throw new Error(
      'La unidad de capacidad no es válida',
    )
  }

  const normalizedEquipmentCode =
    normalizeLoanEquipmentCode(
      input.equipmentCode,
    )

  return {
    ...input,
    equipmentCode: normalizedEquipmentCode,
    normalizedEquipmentCode,
    outgoingCondition:
      normalizeLoanOutgoingCondition(
        input.outgoingCondition,
      ),
  }
}

export function resolveSalesNoteLoanSummary(
  summary?: SalesNoteLoanSummary | null,
): SalesNoteLoanSummary {
  if (!summary) {
    return {
      ...EMPTY_SALES_NOTE_LOAN_SUMMARY,
    }
  }

  const validTotal =
    Number.isSafeInteger(summary.totalCount) &&
    summary.totalCount >= 0

  const validActive =
    Number.isSafeInteger(summary.activeCount) &&
    summary.activeCount >= 0 &&
    summary.activeCount <= summary.totalCount

  if (!validTotal || !validActive) {
    throw new Error(
      'El resumen de préstamos no es válido',
    )
  }

  return {
    totalCount: summary.totalCount,
    activeCount: summary.activeCount,
  }
}
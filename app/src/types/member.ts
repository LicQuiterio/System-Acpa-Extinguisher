export const USER_ROLES = [
  'owner',
  'admin',
  'driver',
  'assistant',
  'technician',
] as const

export type UserRole = (typeof USER_ROLES)[number]

export const SALES_NOTE_ROLES = [
  'owner',
  'admin',
  'driver',
] as const satisfies readonly UserRole[]

export const MANUAL_FOLIO_ROLES = [
  'owner',
] as const satisfies readonly UserRole[]

export const SALES_NOTE_RESCHEDULING_ROLES = [
  'owner',
  'admin',
] as const satisfies readonly UserRole[]

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Dueño',
  admin: 'Administrador',
  driver: 'Conductor',
  assistant: 'Auxiliar',
  technician: 'Técnico',
}

export function canManageSalesNotes(role: UserRole): boolean {
  return SALES_NOTE_ROLES.includes(
    role as (typeof SALES_NOTE_ROLES)[number],
  )
}

export function canUseManualFolio(role: UserRole): boolean {
  return MANUAL_FOLIO_ROLES.includes(
    role as (typeof MANUAL_FOLIO_ROLES)[number],
  )
}

export function canRescheduleSalesNoteDelivery(
  role: UserRole,
): boolean {
  return SALES_NOTE_RESCHEDULING_ROLES.includes(
    role as (
      typeof SALES_NOTE_RESCHEDULING_ROLES
    )[number],
  )
}

export type Member = {
  businessId: string
  email: string
  displayName: string
  role: UserRole
  active: boolean
}

export type MemberWithId = Member & {
  id: string
}
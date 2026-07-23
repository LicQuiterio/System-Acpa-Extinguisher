export const USER_ROLES = ['owner','admin','assistant','technician'] as const 
export type UserRole = (typeof USER_ROLES)[number]

export const ROLE_LABELS: Record<UserRole, string> = {
    owner: 'Dueño', 
    admin: 'Administrador',
    assistant: 'Auxiliar',
    technician: 'Tecnico'
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
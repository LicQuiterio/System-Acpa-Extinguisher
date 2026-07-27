import { createContext } from 'react'
import type { User } from 'firebase/auth'
import type { Member } from '../types/member'

export type AuthContextValue = {
  user: User | null
  member: Member | null
  loading: boolean
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
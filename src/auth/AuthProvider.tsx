import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { getMember } from '../services/memberService'
import type { Member } from '../types/member'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true 

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return 

      setUser(currentUser)

      if (!currentUser) {
        setMember(null)
        setLoading(false)
        return
      }

      try {
        const currentMember = await getMember(currentUser.uid)
        if (isMounted) {
          setMember(currentMember)
        }
      } catch {
        if (isMounted) {
          setMember(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      member,
      loading,
      logout: () => signOut(auth),
    }),
    [user, member, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
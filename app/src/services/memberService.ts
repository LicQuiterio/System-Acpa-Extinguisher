import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Member, MemberWithId } from '../types/member'


export async function getMember(uid: string): Promise<Member | null> {
    const memberSnapshot = await getDoc(doc(db, 'members', uid))
    if (!memberSnapshot.exists()) {
        return null
    }
    return memberSnapshot.data() as Member
}

export async function getActiveTechnicians(
  businessId: string,
): Promise<MemberWithId[]> {
  const techniciansQuery = query(
    collection(db, 'members'),
    where('businessId', '==', businessId),
    where('role', '==', 'technician'),
    where('active', '==', true),
  )

  const snapshot = await getDocs(techniciansQuery)

  return snapshot.docs
    .map(
      (memberDocument) =>
        ({
          id: memberDocument.id,
          ...memberDocument.data(),
        }) as MemberWithId,
    )
    .sort((a, b) =>
      a.displayName.localeCompare(b.displayName, 'es'),
    )
}

export async function getMemberDisplayNames(
  businessId: string,
  userIds: readonly string[],
): Promise<Record<string, string>> {
  if (!businessId.trim()) {
    throw new Error('El negocio es obligatorio')
  }

  const uniqueUserIds = [
    ...new Set(
      userIds
        .map((userId) => userId.trim())
        .filter(Boolean),
    ),
  ]

  const entries = await Promise.all(
    uniqueUserIds.map(async (userId) => {
      try {
        const memberSnapshot = await getDoc(
          doc(db, 'members', userId),
        )

        if (!memberSnapshot.exists()) {
          return [userId, userId] as const
        }

        const member =
          memberSnapshot.data() as Member

        if (member.businessId !== businessId) {
          return [userId, userId] as const
        }

        const displayName =
          member.displayName.trim() ||
          member.email.trim() ||
          userId

        return [userId, displayName] as const
      } catch {
        return [userId, userId] as const
      }
    }),
  )

  return Object.fromEntries(entries)
}

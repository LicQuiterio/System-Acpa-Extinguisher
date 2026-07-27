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

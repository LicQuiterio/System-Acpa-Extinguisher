import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase' 
import  type { Member } from '../types/member' 

export async function getMember(uid: string): Promise<Member | null> {
    const memberSnapshot = await getDoc(doc(db, 'members', uid))
    if (!memberSnapshot.exists()) {
        return null
    }
    return memberSnapshot.data() as Member
}
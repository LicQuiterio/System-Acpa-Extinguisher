import {
    addDoc,
    collection,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Client, ClientInput } from '../types/client'

function clientsCollection(businessId: string) {
    return collection(db, 'businesses', businessId, 'clients')
}

export async function getClients(businessId:string): Promise<Client[]> {
    const clientsQuery = query(
        clientsCollection(businessId),
        orderBy('name'),
    )

    const snapshot = await getDocs(clientsQuery)

    return snapshot.docs.map((clientDocument) => ({
        id: clientDocument.id,
        ...clientDocument.data(),
    })) as Client[]
}

export async function createClient(
    businessId: string,
    userId: string,
    input: ClientInput,
): Promise <string> {
    const clientReference = await addDoc(
        clientsCollection(businessId),
        {
            ...input,
            name: input.name.trim(),
            legalName: input.legalName.trim(),
            rfc: input.rfc.trim().toUpperCase(),
            contactName: input.contactName.trim(),
            phone: input.phone.trim(),
            email: input.email.trim().toLowerCase(),
            notes: input.notes.trim(),
            active: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: userId,
            updatedBy: userId,
        },
    )

    return clientReference.id
}

export async function updateClient(businessId: string, clientId: string, userId: string, input: ClientInput): Promise<void> {
    const clientReference = doc(db, 'businesses', businessId, 'clients', clientId)

    await updateDoc(clientReference, {
        ...input,
        name: input.name.trim(),
        legalName: input.legalName.trim(),
        rfc: input.rfc.trim().toUpperCase(),
        contactName: input.contactName.trim(),
        phone: input.phone.trim(),
        email: input.email.trim().toLowerCase(),
        notes: input.notes.trim(),
        updatedAt: serverTimestamp(),
        updatedBy: userId,
    })
}

export async function setClientActive(businessId: string, clientId: string, userId: string, active: boolean): Promise<void> {
    const clientReference = doc(db, 'businesses', businessId, 'clients', clientId)
    await updateDoc(clientReference, {
        active,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
    })
}
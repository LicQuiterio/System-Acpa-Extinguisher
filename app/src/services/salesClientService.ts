import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import {
  getSalesClientDisplayName,
  isSalesClient,
  type Client,
  type SalesClient,
  type SalesClientInput,
} from '../types/client'

function clientsCollection(businessId: string) {
  return collection(
    db,
    'businesses',
    businessId,
    'clients',
  )
}

function validateSalesClientInput(
  input: SalesClientInput,
): void {
  if (
    input.type === 'company' &&
    !input.companyName.trim()
  ) {
    throw new Error(
      'El nombre de la empresa es obligatorio',
    )
  }

  if (!input.contactName.trim()) {
    throw new Error(
      'El nombre del contacto es obligatorio',
    )
  }

  if (!input.phone.trim()) {
    throw new Error('El teléfono es obligatorio')
  }

  if (!input.address.trim()) {
    throw new Error('La dirección es obligatoria')
  }

  if (!input.serviceArea.serviceAreaId.trim()) {
    throw new Error(
      'La zona o comunidad es obligatoria',
    )
  }
}

export async function getSalesClients(
  businessId: string,
): Promise<SalesClient[]> {
  const snapshot = await getDocs(
    clientsCollection(businessId),
  )

  const clients = snapshot.docs
    .map((clientDocument) => ({
      id: clientDocument.id,
      ...clientDocument.data(),
    }) as Client | SalesClient)
    .filter(isSalesClient)

  return clients.sort((firstClient, secondClient) =>
    getSalesClientDisplayName(firstClient).localeCompare(
      getSalesClientDisplayName(secondClient),
      'es',
    ),
  )
}

export async function getSalesClient(
  businessId: string,
  clientId: string,
): Promise<SalesClient | null> {
  const clientReference = doc(
    db,
    'businesses',
    businessId,
    'clients',
    clientId,
  )

  const snapshot = await getDoc(clientReference)

  if (!snapshot.exists()) {
    return null
  }

  const client = {
    id: snapshot.id,
    ...snapshot.data(),
  } as Client | SalesClient

  return isSalesClient(client) ? client : null
}

export async function createSalesClient(
  businessId: string,
  userId: string,
  input: SalesClientInput,
): Promise<string> {
  validateSalesClientInput(input)

  const companyName =
    input.type === 'company'
      ? input.companyName.trim()
      : ''

  const contactName = input.contactName.trim()
  const displayName =
    input.type === 'company'
      ? companyName
      : contactName

  const clientReference = await addDoc(
    clientsCollection(businessId),
    {
      schemaVersion: 2,

      type: input.type,
      companyName,
      contactName,
      phone: input.phone.trim(),
      email: input.email.trim().toLowerCase(),
      address: input.address.trim(),

      serviceAreaId:
        input.serviceArea.serviceAreaId,
      serviceAreaSnapshot: {
        serviceAreaId:
          input.serviceArea.serviceAreaId,
        municipality:
          input.serviceArea.municipality,
        locality:
          input.serviceArea.locality,
        displayName:
          input.serviceArea.displayName,
      },

      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      updatedBy: userId,

      // Compatibilidad temporal con las pantallas antiguas.
      name: displayName,
      legalName: companyName,
      rfc: '',
      notes: '',
    },
  )

  return clientReference.id
}

export async function updateSalesClient(
  businessId: string,
  clientId: string,
  userId: string,
  input: SalesClientInput,
): Promise<void> {
  validateSalesClientInput(input)

  const companyName =
    input.type === 'company'
      ? input.companyName.trim()
      : ''

  const contactName = input.contactName.trim()
  const displayName =
    input.type === 'company'
      ? companyName
      : contactName

  const clientReference = doc(
    db,
    'businesses',
    businessId,
    'clients',
    clientId,
  )

  await updateDoc(clientReference, {
    type: input.type,
    companyName,
    contactName,
    phone: input.phone.trim(),
    email: input.email.trim().toLowerCase(),
    address: input.address.trim(),

    serviceAreaId:
      input.serviceArea.serviceAreaId,
    serviceAreaSnapshot: {
      serviceAreaId:
        input.serviceArea.serviceAreaId,
      municipality:
        input.serviceArea.municipality,
      locality:
        input.serviceArea.locality,
      displayName:
        input.serviceArea.displayName,
    },

    updatedAt: serverTimestamp(),
    updatedBy: userId,

    // Compatibilidad temporal.
    name: displayName,
    legalName: companyName,
    rfc: '',
    notes: '',
  })
}

export async function setSalesClientActive(
  businessId: string,
  clientId: string,
  userId: string,
  active: boolean,
): Promise<void> {
  const clientReference = doc(
    db,
    'businesses',
    businessId,
    'clients',
    clientId,
  )

  await updateDoc(clientReference, {
    active,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  })
}
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type {
  Extinguisher,
  ExtinguisherInput,
} from '../types/extinguisher'

function extinguishersCollection(businessId: string) {
  return collection(db, 'businesses', businessId, 'extinguishers')
}

function dateToTimestamp(date: string): Timestamp | null {
  if (!date) {
    return null
  }

  // Mediodía evita que la fecha cambie por diferencia de zona horaria.
  return Timestamp.fromDate(new Date(`${date}T12:00:00`))
}

function extinguisherData(input: ExtinguisherInput) {
  return {
    clientId: input.clientId.trim(),
    locationId: input.locationId.trim(),
    serialNumber: input.serialNumber.trim(),
    type: input.type,
    capacityValue: input.capacityValue,
    capacityUnit: input.capacityUnit,
    brand: input.brand.trim(),
    model: input.model.trim(),
    condition: input.condition,
    lastServiceDate: dateToTimestamp(input.lastServiceDate),
    nextServiceDate: dateToTimestamp(input.nextServiceDate),
    notes: input.notes.trim(),
    active: input.active,
  }
}

export async function getLocationExtinguishers(
  businessId: string,
  locationId: string,
): Promise<Extinguisher[]> {
  const extinguishersQuery = query(
    extinguishersCollection(businessId),
    where('locationId', '==', locationId),
  )

  const snapshot = await getDocs(extinguishersQuery)

  return snapshot.docs
    .map(
      (extinguisherDocument) =>
        ({
          id: extinguisherDocument.id,
          ...extinguisherDocument.data(),
        }) as Extinguisher,
    )
    .sort((a, b) => a.serialNumber.localeCompare(b.serialNumber, 'es'))
}

export async function getExtinguisher(
  businessId: string,
  extinguisherId: string,
): Promise<Extinguisher | null> {
  const extinguisherReference = doc(
    db,
    'businesses',
    businessId,
    'extinguishers',
    extinguisherId,
  )

  const snapshot = await getDoc(extinguisherReference)

  if (!snapshot.exists()) {
    return null
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as Extinguisher
}

export async function createExtinguisher(
  businessId: string,
  userId: string,
  input: ExtinguisherInput,
): Promise<string> {
  const extinguisherReference = await addDoc(
    extinguishersCollection(businessId),
    {
      ...extinguisherData(input),
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      updatedBy: userId,
    },
  )

  return extinguisherReference.id
}

export async function updateExtinguisher(
  businessId: string,
  extinguisherId: string,
  userId: string,
  input: ExtinguisherInput,
): Promise<void> {
  const extinguisherReference = doc(
    db,
    'businesses',
    businessId,
    'extinguishers',
    extinguisherId,
  )

  await updateDoc(extinguisherReference, {
    ...extinguisherData(input),
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  })
}

export async function setExtinguisherActive(
  businessId: string,
  extinguisherId: string,
  userId: string,
  active: boolean,
): Promise<void> {
  const extinguisherReference = doc(
    db,
    'businesses',
    businessId,
    'extinguishers',
    extinguisherId,
  )

  await updateDoc(extinguisherReference, {
    active,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  })
}
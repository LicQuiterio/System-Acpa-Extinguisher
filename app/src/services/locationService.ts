import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type {
  ClientLocation,
  ClientLocationInput,
} from '../types/client'

function locationsCollection(businessId: string) {
  return collection(db, 'businesses', businessId, 'locations')
}

export async function getClientLocations(
  businessId: string,
  clientId: string,
): Promise<ClientLocation[]> {
  const locationsQuery = query(
    locationsCollection(businessId),
    where('clientId', '==', clientId),
  )

  const snapshot = await getDocs(locationsQuery)

  return snapshot.docs
    .map((locationDocument) => ({
      id: locationDocument.id,
      ...locationDocument.data(),
    }) as ClientLocation)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export async function getLocation(
  businessId: string,
  locationId: string,
): Promise<ClientLocation | null> {
  const locationReference = doc(
    db,
    'businesses',
    businessId,
    'locations',
    locationId,
  )

  const snapshot = await getDoc(locationReference)

  if (!snapshot.exists()) {
    return null
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as ClientLocation
}

export async function createLocation(
  businessId: string,
  userId: string,
  input: ClientLocationInput,
): Promise<string> {
  const locationReference = await addDoc(
    locationsCollection(businessId),
    {
      ...input,
      clientId: input.clientId.trim(),
      name: input.name.trim(),
      street: input.street.trim(),
      exteriorNumber: input.exteriorNumber.trim(),
      interiorNumber: input.interiorNumber.trim(),
      neighborhood: input.neighborhood.trim(),
      postalCode: input.postalCode.trim(),
      city: input.city.trim(),
      municipality: input.municipality.trim(),
      state: input.state.trim(),
      references: input.references.trim(),
      contactName: input.contactName.trim(),
      contactPhone: input.contactPhone.trim(),
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      updatedBy: userId,
    },
  )

  return locationReference.id
}

export async function updateLocation(
  businessId: string,
  locationId: string,
  userId: string,
  input: ClientLocationInput,
): Promise<void> {
  const locationReference = doc(
    db,
    'businesses',
    businessId,
    'locations',
    locationId,
  )

  await updateDoc(locationReference, {
    ...input,
    clientId: input.clientId.trim(),
    name: input.name.trim(),
    street: input.street.trim(),
    exteriorNumber: input.exteriorNumber.trim(),
    interiorNumber: input.interiorNumber.trim(),
    neighborhood: input.neighborhood.trim(),
    postalCode: input.postalCode.trim(),
    city: input.city.trim(),
    municipality: input.municipality.trim(),
    state: input.state.trim(),
    references: input.references.trim(),
    contactName: input.contactName.trim(),
    contactPhone: input.contactPhone.trim(),
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  })
}

export async function setLocationActive(
  businessId: string,
  locationId: string,
  userId: string,
  active: boolean,
): Promise<void> {
  const locationReference = doc(
    db,
    'businesses',
    businessId,
    'locations',
    locationId,
  )

  await updateDoc(locationReference, {
    active,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  })
}
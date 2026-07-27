import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type {
  ServiceVisit,
  ServiceVisitInput,
  ServiceVisitStatus,
} from '../types/serviceVisit'

function serviceVisitsCollection(businessId: string) {
  return collection(db, 'businesses', businessId, 'serviceVisits')
}

function dateToTimestamp(value: string): Timestamp | null {
  if (!value) {
    return null
  }

  return Timestamp.fromDate(new Date(`${value}T12:00:00`))
}

function serviceVisitData(input: ServiceVisitInput) {
  return {
    clientId: input.clientId.trim(),
    locationId: input.locationId.trim(),
    scheduledDate: dateToTimestamp(input.scheduledDate),
    completedDate:
      input.status === 'completed'
        ? dateToTimestamp(input.completedDate)
        : null,
    technicianId: input.technicianId.trim(),
    technicianName: input.technicianName.trim(),
    status: input.status,
    notes: input.notes.trim(),
  }
}

export async function getLocationServiceVisits(
  businessId: string,
  locationId: string,
): Promise<ServiceVisit[]> {
  const visitsQuery = query(
    serviceVisitsCollection(businessId),
    where('locationId', '==', locationId),
  )

  const snapshot = await getDocs(visitsQuery)

  return snapshot.docs
    .map(
      (visitDocument) =>
        ({
          id: visitDocument.id,
          ...visitDocument.data(),
        }) as ServiceVisit,
    )
    .sort(
      (a, b) =>
        b.scheduledDate.toMillis() - a.scheduledDate.toMillis(),
    )
}

export async function createServiceVisit(
  businessId: string,
  userId: string,
  input: ServiceVisitInput,
): Promise<string> {
  const data = serviceVisitData(input)

  if (!data.scheduledDate) {
    throw new Error('La fecha programada es obligatoria.')
  }

  const visitReference = await addDoc(
    serviceVisitsCollection(businessId),
    {
      ...data,
      status: 'scheduled',
      completedDate: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      updatedBy: userId,
    },
  )

  return visitReference.id
}

export async function updateServiceVisit(
  businessId: string,
  visitId: string,
  userId: string,
  input: ServiceVisitInput,
): Promise<void> {
  const data = serviceVisitData(input)

  if (!data.scheduledDate) {
    throw new Error('La fecha programada es obligatoria.')
  }

  if (input.status === 'completed' && !data.completedDate) {
    throw new Error('La fecha de finalización es obligatoria.')
  }

  await updateDoc(
    doc(db, 'businesses', businessId, 'serviceVisits', visitId),
    {
      ...data,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    },
  )
}

export async function updateServiceVisitStatus(
  businessId: string,
  visitId: string,
  userId: string,
  status: Extract<ServiceVisitStatus, 'in_progress' | 'completed'>,
): Promise<void> {
  await updateDoc(
    doc(db, 'businesses', businessId, 'serviceVisits', visitId),
    {
      status,
      completedDate: status === 'completed' ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    },
  )
}
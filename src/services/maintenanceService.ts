import {
    collection,
    doc,
    getDocs,
    query,
    serverTimestamp,
    Timestamp,
    where,
    writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type {
    Maintenance, 
    MaintenanceInput,
} from '../types/maintenance'

function maintenancesCollection(businessId: string) {
  return collection(db, 'businesses', businessId, 'maintenances')
}

function dateToTimestamp(date: string): Timestamp | null {
  if (!date) {
    return null
  }

  return Timestamp.fromDate(new Date(`${date}T12:00:00`))
}

function maintenanceData(input: MaintenanceInput) {
  return {
    clientId: input.clientId.trim(),
    locationId: input.locationId.trim(),
    extinguisherId: input.extinguisherId.trim(),
    visitDate: dateToTimestamp(input.visitDate),
    technicianId: input.technicianId.trim(),
    technicianName: input.technicianName.trim(),
    result: input.result,
    notes: input.notes.trim(),
    nextServiceDate: dateToTimestamp(input.nextServiceDate),
  }
}

export async function getExtinguisherMaintenances(businessId: string, extinguisherId: string): Promise<Maintenance[]> {
     const maintenancesQuery = query(
    maintenancesCollection(businessId),
    where('extinguisherId', '==', extinguisherId),
  )

  const snapshot = await getDocs(maintenancesQuery)

  return snapshot.docs
    .map(
      (maintenanceDocument) =>
        ({
          id: maintenanceDocument.id,
          ...maintenanceDocument.data(),
        }) as Maintenance,
    )
    .sort(
      (a, b) =>
        b.visitDate.toMillis() - a.visitDate.toMillis(),
    )
}

export async function createMaintenance(businessId:string, userId:string, input: MaintenanceInput): Promise<string> {
    const visitDate = dateToTimestamp(input.visitDate)

    
  if (!visitDate) {
    throw new Error('La fecha de visita es obligatoria.')
  }
  const maintenanceReference = doc(
    maintenancesCollection(businessId),
  )
  const extinguisherReference = doc(
    db,
    'businesses',
    businessId,
    'extinguishers',
    input.extinguisherId,
  )
  const batch = writeBatch(db)

  batch.set(maintenanceReference, {
    ...maintenanceData(input),
    visitDate,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId,
    updatedBy: userId,
  })

  batch.update(extinguisherReference, {
    lastServiceDate: visitDate,
    nextServiceDate: dateToTimestamp(input.nextServiceDate),
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  })

  await batch.commit()

  return maintenanceReference.id
}
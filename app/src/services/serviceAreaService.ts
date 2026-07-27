import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type {
  CreateServiceAreaInput,
  ServiceArea,
} from '../types/serviceArea'
import { normalizeServiceAreaName } from '../utils/serviceAreaUtils'
import { buildServiceAreaDisplayName } from '../utils/serviceAreaUtils'

export type CreateServiceAreaResult = {
  id: string
  created: boolean
}

function serviceAreasCollection(businessId: string) {
  return collection(
    db,
    'businesses',
    businessId,
    'serviceAreas',
  )
}

function buildManualServiceAreaId(
  municipality: string,
  locality: string,
): string {
  const municipalityPart =
    normalizeServiceAreaName(municipality)
      .replace(/\s+/g, '-')

  const localityPart =
    normalizeServiceAreaName(locality)
      .replace(/\s+/g, '-')

  return `manual_${municipalityPart}_${localityPart}`
}

export async function getActiveServiceAreas(
  businessId: string,
): Promise<ServiceArea[]> {
  const areasQuery = query(
    serviceAreasCollection(businessId),
    where('active', '==', true),
  )

  const snapshot = await getDocs(areasQuery)

  return snapshot.docs
    .map((areaDocument) => ({
      id: areaDocument.id,
      ...areaDocument.data(),
    }) as ServiceArea)
    .sort((firstArea, secondArea) =>
      firstArea.displayName.localeCompare(
        secondArea.displayName,
        'es',
      ),
    )
}

export async function createManualServiceArea(
  businessId: string,
  userId: string,
  input: CreateServiceAreaInput,
): Promise<CreateServiceAreaResult> {
  const locality = input.locality
    .trim()
    .replace(/\s+/g, ' ')

  const normalizedName =
    normalizeServiceAreaName(locality)

  if (!businessId.trim()) {
    throw new Error('El negocio es obligatorio')
  }

  if (!userId.trim()) {
    throw new Error('El usuario es obligatorio')
  }

  if (!normalizedName) {
    throw new Error(
      'El nombre de la comunidad es obligatorio',
    )
  }

  const existingAreaQuery = query(
    serviceAreasCollection(businessId),
    where('municipality', '==', input.municipality),
    where('normalizedName', '==', normalizedName),
  )

  const existingSnapshot =
    await getDocs(existingAreaQuery)

  if (!existingSnapshot.empty) {
    return {
      id: existingSnapshot.docs[0].id,
      created: false,
    }
  }

  const areaId = buildManualServiceAreaId(
    input.municipality,
    locality,
  )

  const areaReference = doc(
    serviceAreasCollection(businessId),
    areaId,
  )

  return runTransaction(db, async (transaction) => {
    const areaSnapshot =
      await transaction.get(areaReference)

    if (areaSnapshot.exists()) {
      return {
        id: areaReference.id,
        created: false,
      }
    }

    transaction.set(areaReference, {
      municipality: input.municipality,
      locality,
      displayName: buildServiceAreaDisplayName(
        locality,
        input.municipality,
      ),
      normalizedName,
      source: 'manual',
      active: true,
      createdAt: serverTimestamp(),
      createdBy: userId,
    })

    return {
      id: areaReference.id,
      created: true,
    }
  })
}
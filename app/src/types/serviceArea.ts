import type { Timestamp } from 'firebase/firestore'
import type { Municipality } from '../constants/serviceAreas'

export type ServiceAreaSource = 'predefined' | 'manual'

export type ServiceArea = {
  id: string
  municipality: Municipality
  locality: string
  displayName: string
  normalizedName: string
  source: ServiceAreaSource
  active: boolean
  createdAt: Timestamp
  createdBy: string
}

export type ServiceAreaSnapshot = {
  serviceAreaId: string
  municipality: Municipality
  locality: string
  displayName: string
}

export type CreateServiceAreaInput = {
  municipality: Municipality
  locality: string
  source: ServiceAreaSource
}
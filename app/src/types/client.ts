import type { Timestamp } from 'firebase/firestore'
import type { ServiceAreaSnapshot } from './serviceArea'

export type ClientType = 'company' | 'individual'

export type SalesClient = {
  id: string
  schemaVersion: 2

  type: ClientType
  companyName: string
  contactName: string
  phone: string
  email: string
  address: string

  serviceAreaId: string
  serviceAreaSnapshot: ServiceAreaSnapshot

  active: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
  updatedBy: string
}

export type SalesClientInput = {
  type: ClientType
  companyName: string
  contactName: string
  phone: string
  email: string
  address: string
  serviceArea: ServiceAreaSnapshot
}

export function isSalesClient(
  client: Client | SalesClient,
): client is SalesClient {
  return (
    'schemaVersion' in client &&
    client.schemaVersion === 2
  )
}

export function getSalesClientDisplayName(
  client: SalesClient,
): string {
  if (client.type === 'company') {
    return client.companyName
  }

  return client.contactName
}

export type Client = {
  id: string
  name: string
  legalName: string
  rfc: string
  contactName: string
  phone: string
  email: string
  notes: string
  active: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
  updatedBy: string
}

export type ClientInput = {
  name: string
  legalName: string
  rfc: string
  contactName: string
  phone: string
  email: string
  notes: string
  active: boolean
}

export type ClientLocation = {
  id: string
  clientId: string
  name: string
  street: string
  exteriorNumber: string
  interiorNumber: string
  neighborhood: string
  postalCode: string
  city: string
  municipality: string
  state: string
  references: string
  contactName: string
  contactPhone: string
  active: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
  updatedBy: string
}

export type ClientLocationInput = {
  clientId: string
  name: string
  street: string
  exteriorNumber: string
  interiorNumber: string
  neighborhood: string
  postalCode: string
  city: string
  municipality: string
  state: string
  references: string
  contactName: string
  contactPhone: string
  active: boolean
}
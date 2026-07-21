import type { Timestamp } from 'firebase/firestore'

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
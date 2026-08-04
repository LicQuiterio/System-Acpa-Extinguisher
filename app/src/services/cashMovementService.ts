import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type {
  CashMovement,
  RegisterCashOutflowInput,
} from '../types/cashMovement'

export async function getCashMovements(
  businessId: string,
  businessDate: string,
): Promise<CashMovement[]> {
  if (!businessId.trim()) {
    throw new Error('El negocio es obligatorio')
  }

  const snapshot = await getDocs(
    query(
      collection(
        db,
        'businesses',
        businessId,
        'cashMovements',
      ),
      where('businessDate', '==', businessDate),
    ),
  )

  return snapshot.docs
    .map(
      (movementDocument) =>
        ({
          id: movementDocument.id,
          ...movementDocument.data(),
        }) as CashMovement,
    )
    .sort(
      (a, b) =>
        a.occurredAt.toMillis() - b.occurredAt.toMillis() ||
        a.id.localeCompare(b.id),
    )
}

export async function registerCashOutflow(
  businessId: string,
  userId: string,
  businessDate: string,
  input: RegisterCashOutflowInput,
): Promise<string> {
  const concept = input.concept.trim()
  const observations = input.observations.trim()

  if (!businessId.trim()) {
    throw new Error('El negocio es obligatorio')
  }

  if (!userId.trim()) {
    throw new Error('El usuario es obligatorio')
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(businessDate)) {
    throw new Error('La fecha de caja no es válida')
  }

  if (!['expense', 'owner_withdrawal'].includes(input.type)) {
    throw new Error('El tipo de salida no es válido')
  }

  if (!concept || concept.length > 200) {
    throw new Error('Escribe un concepto de hasta 200 caracteres')
  }

  if (
    !Number.isSafeInteger(input.amountCents) ||
    input.amountCents <= 0
  ) {
    throw new Error('El monto debe ser mayor que cero')
  }

  if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) {
    throw new Error('La cantidad debe ser un entero mayor que cero')
  }

  if (observations.length > 500) {
    throw new Error('Las observaciones no pueden superar 500 caracteres')
  }

  const movementReference = await addDoc(
    collection(
      db,
      'businesses',
      businessId,
      'cashMovements',
    ),
    {
      businessDate,
      type: input.type,
      source: 'manual',
      amountCents: input.amountCents,
      paymentMethod: 'cash',
      concept,
      quantity: input.quantity,
      observations,
      noteId: null,
      folioDisplay: null,
      paymentId: null,
      occurredAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      createdBy: userId,
    },
  )

  return movementReference.id
}

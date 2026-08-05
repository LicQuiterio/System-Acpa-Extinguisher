import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type {
  CashClosing,
  CashDayState,
  CashFund,
  CashMovement,
  RegisterCashOutflowInput,
} from '../types/cashMovement'
import {
  calculateAccumulatedCashDailySummary,
  calculateCashDailySummary,
} from '../utils/cashMovement'

function validateBusinessDate(businessDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(businessDate)) {
    throw new Error('La fecha de caja no es válida')
  }
}

export async function getCashDayState(
  businessId: string,
  businessDate: string,
): Promise<CashDayState> {
  if (!businessId.trim()) {
    throw new Error('El negocio es obligatorio')
  }

  validateBusinessDate(businessDate)

  const fundReference = doc(
    db,
    'businesses',
    businessId,
    'cashFund',
    'main',
  )
  const closingReference = doc(
    db,
    'businesses',
    businessId,
    'cashClosings',
    businessDate,
  )
  const [fundSnapshot, closingSnapshot] = await Promise.all([
    getDoc(fundReference),
    getDoc(closingReference),
  ])

  if (!fundSnapshot.exists()) {
    return {
      fund: null,
      movements: [],
      summary: calculateCashDailySummary([]),
      closing: null,
    }
  }

  const fund = fundSnapshot.data() as CashFund

  // ponytail: escaneo del libro mayor desde el lanzamiento; añadir
  // checkpoints mensuales si el volumen real vuelve costosa esta consulta.
  const movementSnapshot = await getDocs(
    query(
      collection(
        db,
        'businesses',
        businessId,
        'cashMovements',
      ),
      where('businessDate', '>=', fund.initializedOn),
      where('businessDate', '<=', businessDate),
    ),
  )
  const allMovements = movementSnapshot.docs.map(
    (movementDocument) => ({
      id: movementDocument.id,
      ...movementDocument.data(),
    }) as CashMovement,
  )
  const movements = allMovements
    .filter((movement) => movement.businessDate === businessDate)
    .sort(
      (a, b) =>
        a.occurredAt.toMillis() - b.occurredAt.toMillis() ||
        a.id.localeCompare(b.id),
    )

  return {
    fund,
    movements,
    summary: calculateAccumulatedCashDailySummary(
      allMovements,
      businessDate,
      fund.initialBalanceCents,
    ),
    closing: closingSnapshot.exists()
      ? closingSnapshot.data() as CashClosing
      : null,
  }
}

export async function initializeCashFund(
  businessId: string,
  userId: string,
  businessDate: string,
  initialBalanceCents: number,
): Promise<void> {
  if (!businessId.trim() || !userId.trim()) {
    throw new Error('El negocio y el usuario son obligatorios')
  }

  validateBusinessDate(businessDate)

  if (
    !Number.isSafeInteger(initialBalanceCents) ||
    initialBalanceCents < 0
  ) {
    throw new Error('El fondo inicial no es válido')
  }

  const fundReference = doc(
    db,
    'businesses',
    businessId,
    'cashFund',
    'main',
  )

  await runTransaction(db, async (transaction) => {
    if ((await transaction.get(fundReference)).exists()) {
      throw new Error('El fondo inicial ya fue configurado')
    }

    transaction.set(fundReference, {
      initialBalanceCents,
      initializedOn: businessDate,
      initializedAt: serverTimestamp(),
      initializedBy: userId,
    })
  })
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

  validateBusinessDate(businessDate)

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

  const movementReference = doc(
    collection(
      db,
      'businesses',
      businessId,
      'cashMovements',
    ),
  )
  const fundReference = doc(
    db,
    'businesses',
    businessId,
    'cashFund',
    'main',
  )
  const closingReference = doc(
    db,
    'businesses',
    businessId,
    'cashClosings',
    businessDate,
  )

  await runTransaction(db, async (transaction) => {
    const [fundSnapshot, closingSnapshot] = await Promise.all([
      transaction.get(fundReference),
      transaction.get(closingReference),
    ])

    if (!fundSnapshot.exists()) {
      throw new Error('Primero configura el fondo inicial de caja')
    }

    if (closingSnapshot.exists()) {
      throw new Error('La caja de este día ya está cerrada')
    }

    transaction.set(movementReference, {
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
    })
  })

  return movementReference.id
}

export async function closeCashDay(
  businessId: string,
  userId: string,
  businessDate: string,
): Promise<void> {
  if (!businessId.trim() || !userId.trim()) {
    throw new Error('El negocio y el usuario son obligatorios')
  }

  validateBusinessDate(businessDate)

  const closingReference = doc(
    db,
    'businesses',
    businessId,
    'cashClosings',
    businessDate,
  )

  await runTransaction(db, async (transaction) => {
    const closingSnapshot = await transaction.get(closingReference)

    if (closingSnapshot.exists()) {
      if (closingSnapshot.data().status === 'closed') {
        throw new Error('La caja de este día ya está cerrada')
      }

      return
    }

    transaction.set(closingReference, {
      businessDate,
      status: 'closing',
      openingBalanceCents: null,
      cashIncomeCents: null,
      electronicIncomeCents: null,
      expenseCents: null,
      withdrawalCents: null,
      closingBalanceCents: null,
      movementCount: null,
      startedAt: serverTimestamp(),
      startedBy: userId,
      closedAt: null,
      closedBy: null,
    })
  })

  const { movements, summary } = await getCashDayState(
    businessId,
    businessDate,
  )

  await updateDoc(closingReference, {
    status: 'closed',
    openingBalanceCents: summary.openingBalanceCents,
    cashIncomeCents: summary.cashIncomeCents,
    electronicIncomeCents: summary.electronicIncomeCents,
    expenseCents: summary.expenseCents,
    withdrawalCents: summary.withdrawalCents,
    closingBalanceCents: summary.estimatedCashCents,
    movementCount: movements.length,
    closedAt: serverTimestamp(),
    closedBy: userId,
  })
}

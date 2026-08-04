import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore'
import { INITIAL_SALES_FOLIO } from '../constants/salesSettings'
import { db } from '../lib/firebase'
import {
  normalizeDeliveryInput,
  prepareDeliveryCompletion,
} from '../utils/salesNoteDelivery'
import {
  isSalesClient,
  type Client,
  type SalesClient,
} from '../types/client'
import type {
  CreateSalesNoteInput,
  CreateSalesNoteResult,
  Payment,
  PaymentInput,
  RegisterSalesNotePaymentResult,
  SalesNoteDetail,
  SalesNoteHistoryDelivery,
  SalesNoteHistoryItem,
  SalesNoteItem,
  SalesNoteTerms,
  SalesNoteDeliveryScheduleChange,
} from '../types/salesNote'
import {
  calculateLineSubtotal,
  calculatePaymentSummary,
  calculateResicoWithholding,
  calculateSubtotal,
  calculateTotal,
  calculateVat,
  RESICO_RATE_BASIS_POINTS,
  VAT_RATE_BASIS_POINTS,
} from '../utils/salesCalculations'
import { calculateAdditionalPaymentSummary } from '../utils/salesNotePayment'
import {
  normalizeSalesNoteCancellationReason,
} from '../utils/salesNoteCancellation'
import {
  normalizeSalesNoteReschedulingReason,
} from '../utils/salesNoteRescheduling'
import type {
  SalesNoteLoanSummary,
} from '../types/salesNoteLoan'
import {
  resolveSalesNoteLoanSummary,
} from '../utils/salesNoteLoan'
import { getBusinessDate } from '../utils/cashMovement'


function normalizeItems(
  items: readonly SalesNoteItem[],
): SalesNoteItem[] {
  if (items.length === 0) {
    throw new Error(
      'Agrega al menos un concepto',
    )
  }

  if (items.length > 100) {
    throw new Error(
      'La nota no puede contener más de 100 conceptos',
    )
  }

  const usedIds = new Set<string>()

  return items.map((item) => {
    if (!item.id.trim()) {
      throw new Error(
        'Cada concepto debe tener un identificador',
      )
    }

    if (usedIds.has(item.id)) {
      throw new Error(
        'Existen conceptos duplicados',
      )
    }

    usedIds.add(item.id)

    const lineSubtotalCents =
      calculateLineSubtotal(
        item.quantity,
        item.unitPriceCents,
      )

    if (item.type === 'general_product') {
      const description = item.description.trim()

      if (!description) {
        throw new Error(
          'La descripción del producto es obligatoria',
        )
      }

      return {
        ...item,
        description,
        notes: item.notes.trim(),
        lineSubtotalCents,
      }
    }

    if (item.capacityValue <= 0) {
      throw new Error(
        'La capacidad debe ser mayor que cero',
      )
    }

    return {
      ...item,
      notes: item.notes.trim(),
      lineSubtotalCents,
    }
  })
}

function normalizeTerms(
  terms: SalesNoteTerms,
): SalesNoteTerms {
  const deliveryTime = terms.deliveryTime.trim()
  const warranty = terms.warranty.trim()

  if (!deliveryTime) {
    throw new Error(
      'El tiempo de entrega es obligatorio',
    )
  }

  if (!warranty) {
    throw new Error(
      'La garantía es obligatoria',
    )
  }

  return {
    deliveryTime,
    warranty,
    clauses: terms.clauses
      .map((clause) => clause.trim())
      .filter(Boolean),
    additionalCondition:
      terms.additionalCondition.trim(),
  }
}

type LegacySalesNote = {
  deliveryStatus?: 'pending' | 'delivered'
}

type SalesNoteHistoryDocument = {
  folioNumber: number
  folioDisplay: string
  issuedAt: Timestamp

  clientId: string
  customerSnapshot: SalesNoteHistoryItem['customerSnapshot']

  amounts: SalesNoteHistoryItem['amounts']

  documentStatus: SalesNoteHistoryItem['documentStatus']
  paymentStatus: SalesNoteHistoryItem['paymentStatus']

  delivery?: {
    status: 'pending' | 'delivered'
    scheduledDate: string | null
    deliveredAt: Timestamp | null
    deliveredBy: string | null
  }

    loanSummary?: SalesNoteLoanSummary
} & LegacySalesNote

type SalesNoteDeliverySource = {
  delivery?: {
    status: 'pending' | 'delivered'
    scheduledDate: string | null
    deliveredAt: Timestamp | null
    deliveredBy: string | null
  }
  deliveryStatus?: 'pending' | 'delivered'
}

type SalesNoteDetailDocument = Omit<
  SalesNoteDetail,
  | 'id'
  | 'delivery'
  | 'payments'
  | 'loanSummary'
> &
  SalesNoteDeliverySource & {
    loanSummary?: SalesNoteLoanSummary
  }

export function resolveHistoryDelivery(
  note: SalesNoteDeliverySource,
): SalesNoteHistoryDelivery {
  if (note.delivery) {
    return {
      ...note.delivery,
      isLegacy: false,
    }
  }

  return {
    status:
      note.deliveryStatus === 'delivered'
        ? 'delivered'
        : 'pending',
    scheduledDate: null,
    deliveredAt: null,
    deliveredBy: null,
    isLegacy: true,
  }
}

export type NextSalesNoteFolio = {
  folioNumber: number
  folioDisplay: string
}

export async function getNextSalesNoteFolio(
  businessId: string,
): Promise<NextSalesNoteFolio> {
  if (!businessId.trim()) {
    throw new Error('El negocio es obligatorio')
  }

  const counterReference = doc(
    db,
    'businesses',
    businessId,
    'counters',
    'salesNotes',
  )

  const counterSnapshot =
    await getDoc(counterReference)

  const storedNextNumber =
    counterSnapshot.exists()
      ? counterSnapshot.data().nextNumber
      : INITIAL_SALES_FOLIO

  if (
    !Number.isSafeInteger(storedNextNumber) ||
    storedNextNumber < 0
  ) {
    throw new Error(
      'El contador de folios no es válido',
    )
  }

  return {
    folioNumber: storedNextNumber,
    folioDisplay: String(
      storedNextNumber,
    ).padStart(5, '0'),
  }
}

export async function createSalesNote(
  businessId: string,
  userId: string,
  input: CreateSalesNoteInput,
): Promise<CreateSalesNoteResult> {
  if (!businessId.trim()) {
    throw new Error('El negocio es obligatorio')
  }

  if (!userId.trim()) {
    throw new Error('El usuario es obligatorio')
  }

  if (!input.clientId.trim()) {
    throw new Error('El cliente es obligatorio')
  }

  if (input.payments.length > 5) {
    throw new Error(
      'La nota no puede contener más de 5 pagos iniciales',
    )
  }

  const items = normalizeItems(input.items)
  const terms = normalizeTerms(input.terms)

  const delivery = normalizeDeliveryInput(
  input.delivery,
)

  const subtotalCents = calculateSubtotal(items)

  const vatAmountCents = calculateVat(
    subtotalCents,
    input.applyVat,
  )

  const resicoAmountCents =
    calculateResicoWithholding(
      subtotalCents,
      input.applyResicoWithholding,
    )

  const totalCents = calculateTotal({
    subtotalCents,
    vatAmountCents,
    resicoAmountCents,
  })

  const paymentSummary =
    calculatePaymentSummary(
      totalCents,
      input.payments,
    )

  const noteReference = doc(
    collection(
      db,
      'businesses',
      businessId,
      'salesNotes',
    ),
  )

  const clientReference = doc(
    db,
    'businesses',
    businessId,
    'clients',
    input.clientId,
  )

  const counterReference = doc(
    db,
    'businesses',
    businessId,
    'counters',
    'salesNotes',
  )

  const paymentReferences = input.payments.map(
    () =>
      doc(
        collection(
          noteReference,
          'payments',
        ),
      ),
  )

  const cashMovementReferences = input.payments.map(
    () =>
      doc(
        collection(
          db,
          'businesses',
          businessId,
          'cashMovements',
        ),
      ),
  )

  const businessDate = getBusinessDate()

  return runTransaction(db, async (transaction) => {
    const clientSnapshot =
      await transaction.get(clientReference)

    const counterSnapshot =
      await transaction.get(counterReference)

    if (!clientSnapshot.exists()) {
      throw new Error('El cliente no existe')
    }

    const client = {
      id: clientSnapshot.id,
      ...clientSnapshot.data(),
    } as Client | SalesClient

    if (!isSalesClient(client)) {
      throw new Error(
        'El cliente debe actualizarse antes de registrar ventas',
      )
    }

    if (!client.active) {
      throw new Error(
        'No se puede vender a un cliente inactivo',
      )
    }

    const storedNextNumber =
      counterSnapshot.exists()
        ? counterSnapshot.data().nextNumber
        : INITIAL_SALES_FOLIO

    if (
      !Number.isSafeInteger(storedNextNumber) ||
      storedNextNumber < 0
    ) {
      throw new Error(
        'El contador de folios no es válido',
      )
    }

    const folioNumber = storedNextNumber
    const folioDisplay = String(
      folioNumber,
    ).padStart(5, '0')

    transaction.set(counterReference, {
      nextNumber: folioNumber + 1,
      lastNoteId: noteReference.id,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    })

    transaction.set(noteReference, {
      folioNumber,
      folioDisplay,
      folioMode: 'automatic',
      manualFolioReason: null,

      issuedAt: serverTimestamp(),

      clientId: client.id,
      customerSnapshot: {
        type: client.type,
        companyName: client.companyName,
        contactName: client.contactName,
        phone: client.phone,
        email: client.email,
        address: client.address,

        serviceAreaId: client.serviceAreaId,
        municipality:
          client.serviceAreaSnapshot.municipality,
        locality:
          client.serviceAreaSnapshot.locality,
        serviceAreaDisplayName:
          client.serviceAreaSnapshot.displayName,
      },

      items,

      amounts: {
        subtotalCents,

        applyVat: input.applyVat,
        vatRateBasisPoints:
          VAT_RATE_BASIS_POINTS,
        vatAmountCents,

        applyResicoWithholding:
          input.applyResicoWithholding,
        resicoRateBasisPoints:
          RESICO_RATE_BASIS_POINTS,
        resicoAmountCents,

        totalCents,
        paidCents:
          paymentSummary.paidCents,
        balanceCents:
          paymentSummary.balanceCents,
      },

      terms,

      documentStatus: 'issued',
      paymentStatus:
        paymentSummary.paymentStatus,
      delivery:
  delivery.status === 'delivered'
    ? {
        status: 'delivered',
        scheduledDate:
          delivery.scheduledDate || null,
        deliveredAt: serverTimestamp(),
        deliveredBy: userId,
      }
    : {
        status: 'pending',
        scheduledDate:
          delivery.scheduledDate,
        deliveredAt: null,
        deliveredBy: null,
      },

      loanSummary: {
        totalCount: 0,
        activeCount: 0,
      },

      notes: input.notes.trim(),
      cancellation: null,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      updatedBy: userId,
      lastPaymentId: null,
      lastDeliveryScheduleChangeId: null,
      lastLoanId: null,
    })

    input.payments.forEach(
      (payment, index) => {
        const paymentReference = paymentReferences[index]
        const cashMovementReference =
          cashMovementReferences[index]

        transaction.set(
          paymentReference,
          {
            amountCents: payment.amountCents,
            method: payment.method,
            cashMovementId: cashMovementReference.id,
            paidAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            createdBy: userId,
            active: true,
          },
        )

        transaction.set(cashMovementReference, {
          businessDate,
          type: 'income',
          source: 'sales_payment',
          amountCents: payment.amountCents,
          paymentMethod: payment.method,
          concept: `Cobro nota ${folioDisplay} - ${
            client.companyName || client.contactName
          }`,
          quantity: 1,
          observations: '',
          noteId: noteReference.id,
          folioDisplay,
          paymentId: paymentReference.id,
          occurredAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          createdBy: userId,
        })
      },
    )

    return {
      noteId: noteReference.id,
      folioNumber,
      folioDisplay,
    }
  })
}

export async function registerSalesNotePayment(
  businessId: string,
  noteId: string,
  userId: string,
  payment: PaymentInput,
): Promise<RegisterSalesNotePaymentResult> {
  if (!businessId.trim()) {
    throw new Error('El negocio es obligatorio')
  }

  if (!noteId.trim()) {
    throw new Error('La nota es obligatoria')
  }

  if (!userId.trim()) {
    throw new Error('El usuario es obligatorio')
  }

  if (
    !['cash', 'transfer', 'card'].includes(
      payment.method,
    )
  ) {
    throw new Error(
      'El método de pago no es válido',
    )
  }

  const noteReference = doc(
    db,
    'businesses',
    businessId,
    'salesNotes',
    noteId,
  )

  const paymentReference = doc(
    collection(noteReference, 'payments'),
  )

  const cashMovementReference = doc(
    collection(
      db,
      'businesses',
      businessId,
      'cashMovements',
    ),
  )

  const businessDate = getBusinessDate()

  return runTransaction(db, async (transaction) => {
    const noteSnapshot =
      await transaction.get(noteReference)

    if (!noteSnapshot.exists()) {
      throw new Error('La nota no existe')
    }

    const note =
      noteSnapshot.data() as SalesNoteDetailDocument

    if (note.documentStatus !== 'issued') {
      throw new Error(
        'No se pueden registrar pagos en una nota cancelada',
      )
    }

    const summary =
      calculateAdditionalPaymentSummary(
        note.amounts,
        payment.amountCents,
      )

    transaction.update(noteReference, {
      'amounts.paidCents': summary.paidCents,
      'amounts.balanceCents':
        summary.balanceCents,
      paymentStatus: summary.paymentStatus,
      lastPaymentId: paymentReference.id,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    })

    transaction.set(paymentReference, {
      amountCents: payment.amountCents,
      method: payment.method,
      cashMovementId: cashMovementReference.id,
      paidAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      createdBy: userId,
      active: true,
    })

    transaction.set(cashMovementReference, {
      businessDate,
      type: 'income',
      source: 'sales_payment',
      amountCents: payment.amountCents,
      paymentMethod: payment.method,
      concept: `Cobro nota ${note.folioDisplay} - ${
        note.customerSnapshot.companyName ||
        note.customerSnapshot.contactName
      }`,
      quantity: 1,
      observations: '',
      noteId,
      folioDisplay: note.folioDisplay,
      paymentId: paymentReference.id,
      occurredAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      createdBy: userId,
    })

    return {
      paymentId: paymentReference.id,
      ...summary,
    }
  })
}

export async function markSalesNoteDelivered(
  businessId: string,
  noteId: string,
  userId: string,
): Promise<void> {
  if (!businessId.trim()) {
    throw new Error('El negocio es obligatorio')
  }

  if (!noteId.trim()) {
    throw new Error('La nota es obligatoria')
  }

  if (!userId.trim()) {
    throw new Error('El usuario es obligatorio')
  }

  const noteReference = doc(
    db,
    'businesses',
    businessId,
    'salesNotes',
    noteId,
  )

  await runTransaction(db, async (transaction) => {
    const noteSnapshot =
      await transaction.get(noteReference)

    if (!noteSnapshot.exists()) {
      throw new Error('La nota no existe')
    }

    const note =
      noteSnapshot.data() as SalesNoteDetailDocument

    if (note.documentStatus !== 'issued') {
      throw new Error(
        'No se puede entregar una nota cancelada',
      )
    }

    const delivery = prepareDeliveryCompletion(
      resolveHistoryDelivery(note),
    )

    transaction.update(noteReference, {
      delivery: {
        status: 'delivered',
        scheduledDate: delivery.scheduledDate,
        deliveredAt: serverTimestamp(),
        deliveredBy: userId,
      },
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    })
  })
}

export async function rescheduleSalesNoteDelivery(
  businessId: string,
  noteId: string,
  userId: string,
  newScheduledDate: string,
  reason: string,
): Promise<void> {
  if (!businessId.trim()) {
    throw new Error('El negocio es obligatorio')
  }

  if (!noteId.trim()) {
    throw new Error('La nota es obligatoria')
  }

  if (!userId.trim()) {
    throw new Error('El usuario es obligatorio')
  }

  const normalizedDelivery =
    normalizeDeliveryInput({
      status: 'pending',
      scheduledDate: newScheduledDate,
    })

  const normalizedReason =
    normalizeSalesNoteReschedulingReason(reason)

  const noteReference = doc(
    db,
    'businesses',
    businessId,
    'salesNotes',
    noteId,
  )

  const scheduleChangeReference = doc(
    collection(
      noteReference,
      'deliveryScheduleChanges',
    ),
  )

  await runTransaction(
    db,
    async (transaction) => {
      const noteSnapshot =
        await transaction.get(noteReference)

      if (!noteSnapshot.exists()) {
        throw new Error('La nota no existe')
      }

      const note =
        noteSnapshot.data() as SalesNoteDetailDocument

      if (note.documentStatus !== 'issued') {
        throw new Error(
          'No se puede reprogramar una nota cancelada',
        )
      }

      const currentDelivery =
        resolveHistoryDelivery(note)

      if (currentDelivery.status !== 'pending') {
        throw new Error(
          'No se puede reprogramar una nota entregada',
        )
      }

      if (
        currentDelivery.scheduledDate ===
        normalizedDelivery.scheduledDate
      ) {
        throw new Error(
          'La nueva fecha debe ser diferente de la fecha actual',
        )
      }

      transaction.update(noteReference, {
        delivery: {
          status: 'pending',
          scheduledDate:
            normalizedDelivery.scheduledDate,
          deliveredAt: null,
          deliveredBy: null,
        },
        lastDeliveryScheduleChangeId:
          scheduleChangeReference.id,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
      })

      transaction.set(scheduleChangeReference, {
        previousScheduledDate:
          currentDelivery.scheduledDate,
        newScheduledDate:
          normalizedDelivery.scheduledDate,
        reason: normalizedReason,
        changedAt: serverTimestamp(),
        changedBy: userId,
      })
    },
  )
}

export async function cancelSalesNote(
  businessId: string,
  noteId: string,
  userId: string,
  reason: string,
): Promise<void> {
  if (!businessId.trim()) {
    throw new Error('El negocio es obligatorio')
  }

  if (!noteId.trim()) {
    throw new Error('La nota es obligatoria')
  }

  if (!userId.trim()) {
    throw new Error('El usuario es obligatorio')
  }

  const normalizedReason =
    normalizeSalesNoteCancellationReason(reason)

  const noteReference = doc(
    db,
    'businesses',
    businessId,
    'salesNotes',
    noteId,
  )

  await runTransaction(db, async (transaction) => {
    const noteSnapshot =
      await transaction.get(noteReference)

    if (!noteSnapshot.exists()) {
      throw new Error('La nota no existe')
    }

    const note =
      noteSnapshot.data() as SalesNoteDetailDocument

    if (note.documentStatus !== 'issued') {
      throw new Error(
        'La nota ya fue cancelada',
      )
    }

        if (note.amounts.paidCents > 0) {
      throw new Error(
        'No se puede cancelar una nota con pagos registrados',
      )
    }

    const loanSummary =
      resolveSalesNoteLoanSummary(
        note.loanSummary,
      )

    if (loanSummary.activeCount > 0) {
      throw new Error(
        'Devuelve todos los extintores prestados antes de cancelar la nota',
      )
    }

    const delivery = resolveHistoryDelivery(note)

    if (delivery.status === 'delivered') {
      throw new Error(
        'No se puede cancelar una nota que ya fue entregada',
      )
    }

    transaction.update(noteReference, {
      documentStatus: 'cancelled',
      cancellation: {
        reason: normalizedReason,
        cancelledAt: serverTimestamp(),
        cancelledBy: userId,
      },
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    })
  })
}

export async function getSalesNotesHistory(
  businessId: string,
): Promise<SalesNoteHistoryItem[]> {
  if (!businessId.trim()) {
    throw new Error('El negocio es obligatorio')
  }

  const notesQuery = query(
    collection(
      db,
      'businesses',
      businessId,
      'salesNotes',
    ),
    orderBy('issuedAt', 'desc'),
  )

  const snapshot = await getDocs(notesQuery)

  return snapshot.docs.map((noteDocument) => {
    const note =
      noteDocument.data() as SalesNoteHistoryDocument

    return {
      id: noteDocument.id,

      folioNumber: note.folioNumber,
      folioDisplay: note.folioDisplay,
      issuedAt: note.issuedAt,

      clientId: note.clientId,
      customerSnapshot: note.customerSnapshot,

      amounts: note.amounts,

      documentStatus: note.documentStatus,
      paymentStatus: note.paymentStatus,
      delivery: resolveHistoryDelivery(note),
      loanSummary:
        resolveSalesNoteLoanSummary(
          note.loanSummary,
        ),
    }
  })
}

export async function getSalesNoteDetail(
  businessId: string,
  noteId: string,
): Promise<SalesNoteDetail | null> {
  if (!businessId.trim()) {
    throw new Error('El negocio es obligatorio')
  }

  if (!noteId.trim()) {
    throw new Error('La nota es obligatoria')
  }

  const noteReference = doc(
    db,
    'businesses',
    businessId,
    'salesNotes',
    noteId,
  )

  const noteSnapshot = await getDoc(noteReference)

  if (!noteSnapshot.exists()) {
    return null
  }

  const paymentsQuery = query(
    collection(noteReference, 'payments'),
    orderBy('paidAt', 'asc'),
  )

  const deliveryScheduleChangesQuery = query(
    collection(
      noteReference,
      'deliveryScheduleChanges',
    ),
    orderBy('changedAt', 'desc'),
  )

  const [
    paymentsSnapshot,
    deliveryScheduleChangesSnapshot,
  ] = await Promise.all([
    getDocs(paymentsQuery),
    getDocs(deliveryScheduleChangesQuery),
  ])

  const note =
    noteSnapshot.data() as SalesNoteDetailDocument

  const payments = paymentsSnapshot.docs.map(
    (paymentDocument) =>
      ({
        id: paymentDocument.id,
        ...paymentDocument.data(),
      }) as Payment,
  )

  const deliveryScheduleChanges =
    deliveryScheduleChangesSnapshot.docs.map(
      (changeDocument) =>
        ({
          id: changeDocument.id,
          ...changeDocument.data(),
        }) as SalesNoteDeliveryScheduleChange,
    )

  return {
    id: noteSnapshot.id,
    ...note,
    delivery: resolveHistoryDelivery(note),
    payments,
    deliveryScheduleChanges,
    loanSummary:
      resolveSalesNoteLoanSummary(
        note.loanSummary,
      ),
  }
}


import {
  collection,
  doc,
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
} from '../utils/salesNoteDelivery'
import {
  isSalesClient,
  type Client,
  type SalesClient,
} from '../types/client'
import type {
  CreateSalesNoteInput,
  CreateSalesNoteResult,
  SalesNoteHistoryDelivery,
  SalesNoteHistoryItem,
  SalesNoteItem,
  SalesNoteTerms,
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

  if (input.payments.length > 50) {
    throw new Error(
      'La nota no puede contener más de 50 pagos iniciales',
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

      notes: input.notes.trim(),
      cancellation: null,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      updatedBy: userId,
    })

    input.payments.forEach(
      (payment, index) => {
        transaction.set(
          paymentReferences[index],
          {
            amountCents: payment.amountCents,
            method: payment.method,
            paidAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            createdBy: userId,
            active: true,
          },
        )
      },
    )

    return {
      noteId: noteReference.id,
      folioNumber,
      folioDisplay,
    }
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
    }
  })
}


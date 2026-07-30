import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type {
  LoanerCodeRegistry,
  RegisterSalesNoteLoanInput,
  RegisterSalesNoteLoanResult,
  ReturnSalesNoteLoanResult,
  SalesNoteLoan,
  SalesNoteLoanSummary,
} from '../types/salesNoteLoan'
import {
  normalizeLoanReturnNotes,
  normalizeSalesNoteLoanInput,
  resolveSalesNoteLoanSummary,
} from '../utils/salesNoteLoan'

type SalesNoteLoanParentDocument = {
  documentStatus: 'issued' | 'cancelled'
  loanSummary?: SalesNoteLoanSummary
}

function validateIdentifiers(
  businessId: string,
  noteId: string,
  userId: string,
): void {
  if (!businessId.trim()) {
    throw new Error('El negocio es obligatorio')
  }

  if (!noteId.trim()) {
    throw new Error('La nota es obligatoria')
  }

  if (!userId.trim()) {
    throw new Error('El usuario es obligatorio')
  }
}

export async function registerSalesNoteLoan(
  businessId: string,
  noteId: string,
  userId: string,
  input: RegisterSalesNoteLoanInput,
): Promise<RegisterSalesNoteLoanResult> {
  validateIdentifiers(
    businessId,
    noteId,
    userId,
  )

  const normalizedInput =
    normalizeSalesNoteLoanInput(input)

  const noteReference = doc(
    db,
    'businesses',
    businessId,
    'salesNotes',
    noteId,
  )

  const loanReference = doc(
    collection(noteReference, 'loans'),
  )

  const registryReference = doc(
    db,
    'businesses',
    businessId,
    'loanerCodeRegistry',
    normalizedInput.normalizedEquipmentCode,
  )

  return runTransaction(
    db,
    async (transaction) => {
      const [
        noteSnapshot,
        registrySnapshot,
      ] = await Promise.all([
        transaction.get(noteReference),
        transaction.get(registryReference),
      ])

      if (!noteSnapshot.exists()) {
        throw new Error('La nota no existe')
      }

      const note =
        noteSnapshot.data() as
          SalesNoteLoanParentDocument

      if (note.documentStatus !== 'issued') {
        throw new Error(
          'No se pueden registrar préstamos en una nota cancelada',
        )
      }

      if (registrySnapshot.exists()) {
        const registry =
          registrySnapshot.data() as
            LoanerCodeRegistry

        if (registry.status === 'on_loan') {
          throw new Error(
            `El equipo ${registry.equipmentCode} ya se encuentra prestado`,
          )
        }

        if (registry.status !== 'available') {
          throw new Error(
            'El estado del equipo no es válido',
          )
        }
      }

      const currentSummary =
        resolveSalesNoteLoanSummary(
          note.loanSummary,
        )

      const nextSummary: SalesNoteLoanSummary = {
        totalCount:
          currentSummary.totalCount + 1,
        activeCount:
          currentSummary.activeCount + 1,
      }

      transaction.set(loanReference, {
        equipmentCode:
          normalizedInput.equipmentCode,
        normalizedEquipmentCode:
          normalizedInput.normalizedEquipmentCode,

        reason: normalizedInput.reason,
        agent: normalizedInput.agent,
        capacityValue:
          normalizedInput.capacityValue,
        capacityUnit:
          normalizedInput.capacityUnit,

        outgoingCondition:
          normalizedInput.outgoingCondition,

        status: 'active',

        loanedAt: serverTimestamp(),
        loanedBy: userId,

        returnedAt: null,
        returnedBy: null,
        returnNotes: '',
      })

      transaction.set(registryReference, {
        equipmentCode:
          normalizedInput.equipmentCode,
        status: 'on_loan',

        currentNoteId: noteId,
        currentLoanId: loanReference.id,

        updatedAt: serverTimestamp(),
        updatedBy: userId,
      })

      transaction.update(noteReference, {
        loanSummary: nextSummary,
        lastLoanId: loanReference.id,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
      })

      return {
        loanId: loanReference.id,
        loanSummary: nextSummary,
      }
    },
  )
}

export async function returnSalesNoteLoan(
  businessId: string,
  noteId: string,
  loanId: string,
  userId: string,
  returnNotes: string,
): Promise<ReturnSalesNoteLoanResult> {
  validateIdentifiers(
    businessId,
    noteId,
    userId,
  )

  if (!loanId.trim()) {
    throw new Error(
      'El préstamo es obligatorio',
    )
  }

  const normalizedReturnNotes =
    normalizeLoanReturnNotes(returnNotes)

  const noteReference = doc(
    db,
    'businesses',
    businessId,
    'salesNotes',
    noteId,
  )

  const loanReference = doc(
    noteReference,
    'loans',
    loanId,
  )

  return runTransaction(
    db,
    async (transaction) => {
      const [
        noteSnapshot,
        loanSnapshot,
      ] = await Promise.all([
        transaction.get(noteReference),
        transaction.get(loanReference),
      ])

      if (!noteSnapshot.exists()) {
        throw new Error('La nota no existe')
      }

      if (!loanSnapshot.exists()) {
        throw new Error(
          'El préstamo no existe',
        )
      }

      const note =
        noteSnapshot.data() as
          SalesNoteLoanParentDocument

      const loan =
        loanSnapshot.data() as SalesNoteLoan

      if (loan.status !== 'active') {
        throw new Error(
          'El equipo ya fue devuelto',
        )
      }

      const registryReference = doc(
        db,
        'businesses',
        businessId,
        'loanerCodeRegistry',
        loan.normalizedEquipmentCode,
      )

      const registrySnapshot =
        await transaction.get(
          registryReference,
        )

      if (!registrySnapshot.exists()) {
        throw new Error(
          'No existe el registro técnico del equipo',
        )
      }

      const registry =
        registrySnapshot.data() as
          LoanerCodeRegistry

      const registryMatchesLoan =
        registry.status === 'on_loan' &&
        registry.currentNoteId === noteId &&
        registry.currentLoanId === loanId

      if (!registryMatchesLoan) {
        throw new Error(
          'El registro técnico del equipo no coincide con el préstamo',
        )
      }

      const currentSummary =
        resolveSalesNoteLoanSummary(
          note.loanSummary,
        )

      if (currentSummary.activeCount < 1) {
        throw new Error(
          'El resumen de préstamos no coincide con el equipo activo',
        )
      }

      const nextSummary: SalesNoteLoanSummary = {
        totalCount:
          currentSummary.totalCount,
        activeCount:
          currentSummary.activeCount - 1,
      }

      transaction.update(loanReference, {
        status: 'returned',
        returnedAt: serverTimestamp(),
        returnedBy: userId,
        returnNotes: normalizedReturnNotes,
      })

      transaction.update(registryReference, {
        status: 'available',
        currentNoteId: null,
        currentLoanId: null,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
      })

      transaction.update(noteReference, {
        loanSummary: nextSummary,
        lastLoanId: loanId,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
      })

      return {
        loanSummary: nextSummary,
      }
    },
  )
}

export async function getSalesNoteLoans(
  businessId: string,
  noteId: string,
): Promise<SalesNoteLoan[]> {
  if (!businessId.trim()) {
    throw new Error('El negocio es obligatorio')
  }

  if (!noteId.trim()) {
    throw new Error('La nota es obligatoria')
  }

  const loansQuery = query(
    collection(
      db,
      'businesses',
      businessId,
      'salesNotes',
      noteId,
      'loans',
    ),
    orderBy('loanedAt', 'desc'),
  )

  const snapshot = await getDocs(loansQuery)

  return snapshot.docs.map(
    (loanDocument) =>
      ({
        id: loanDocument.id,
        ...loanDocument.data(),
      }) as SalesNoteLoan,
  )
}
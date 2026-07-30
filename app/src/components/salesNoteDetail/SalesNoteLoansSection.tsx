import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import type { Timestamp } from 'firebase/firestore'
import {
  CAPACITIES,
  CAPACITY_UNITS,
  EXTINGUISHER_AGENTS,
  type CapacityUnit,
  type ExtinguisherAgent,
} from '../../constants/sales'
import {
  SALES_NOTE_LOAN_REASONS,
} from '../../constants/salesNoteLoans'
import { getMemberDisplayNames } from '../../services/memberService'
import {
  getSalesNoteLoans,
  registerSalesNoteLoan,
  returnSalesNoteLoan,
} from '../../services/salesNoteLoanService'
import type {
  RegisterSalesNoteLoanInput,
  SalesNoteLoan,
  SalesNoteLoanReason,
  SalesNoteLoanSummary,
} from '../../types/salesNoteLoan'

type SalesNoteLoansSectionProps = {
  businessId: string
  noteId: string
  userId: string | null
  documentStatus: 'issued' | 'cancelled'
  canManage: boolean
  onLoanSummaryChange: (
    summary: SalesNoteLoanSummary,
  ) => void
}

function findLabel(
  options: readonly {
    value: string
    label: string
  }[],
  value: string,
): string {
  return (
    options.find(
      (option) => option.value === value,
    )?.label ?? value
  )
}

function formatTimestamp(
  timestamp: Timestamp,
): string {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp.toDate())
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  return error instanceof Error
    ? error.message
    : fallback
}

export function SalesNoteLoansSection({
  businessId,
  noteId,
  userId,
  documentStatus,
  canManage,
  onLoanSummaryChange,
}: SalesNoteLoansSectionProps) {
  const [loans, setLoans] =
    useState<SalesNoteLoan[]>([])

  const [memberNames, setMemberNames] = useState<
    Record<string, string>
  >({})

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [registrationOpen, setRegistrationOpen] =
    useState(false)

  const [equipmentCode, setEquipmentCode] =
    useState('')

  const [reason, setReason] =
    useState<SalesNoteLoanReason>('recharge')

  const [agent, setAgent] =
    useState<ExtinguisherAgent>('pqs')

  const [capacityUnit, setCapacityUnit] =
    useState<CapacityUnit>('kg')

  const [capacityValue, setCapacityValue] =
    useState<number>(4.5)

  const [
    outgoingCondition,
    setOutgoingCondition,
  ] = useState('')

  const [submitting, setSubmitting] =
    useState(false)

  const [returningLoanId, setReturningLoanId] =
    useState<string | null>(null)

  const [returnNotes, setReturnNotes] =
    useState('')

  async function loadLoans(): Promise<void> {
    const loadedLoans = await getSalesNoteLoans(
      businessId,
      noteId,
    )

    const relatedUserIds = loadedLoans.flatMap(
      (loan) => [
        loan.loanedBy,
        loan.returnedBy,
      ],
    ).filter(
      (id): id is string => Boolean(id),
    )

    const loadedMemberNames =
      await getMemberDisplayNames(
        businessId,
        relatedUserIds,
      )

    setLoans(loadedLoans)
    setMemberNames(loadedMemberNames)
  }

  useEffect(() => {
    let cancelled = false

    getSalesNoteLoans(businessId, noteId)
      .then(async (loadedLoans) => {
        const relatedUserIds =
          loadedLoans.flatMap((loan) => [
            loan.loanedBy,
            loan.returnedBy,
          ]).filter(
            (id): id is string => Boolean(id),
          )

        const loadedMemberNames =
          await getMemberDisplayNames(
            businessId,
            relatedUserIds,
          )

        if (!cancelled) {
          setLoans(loadedLoans)
          setMemberNames(loadedMemberNames)
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(
            getErrorMessage(
              loadError,
              'No fue posible cargar los préstamos.',
            ),
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [businessId, noteId])

  function resetRegistrationForm(): void {
    setEquipmentCode('')
    setReason('recharge')
    setAgent('pqs')
    setCapacityUnit('kg')
    setCapacityValue(4.5)
    setOutgoingCondition('')
  }

  async function handleRegisterLoan(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()

    if (!userId) {
      return
    }

    setSubmitting(true)
    setError('')
    setMessage('')

    const input: RegisterSalesNoteLoanInput = {
      equipmentCode,
      reason,
      agent,
      capacityValue,
      capacityUnit,
      outgoingCondition,
    }

    try {
      const result =
        await registerSalesNoteLoan(
          businessId,
          noteId,
          userId,
          input,
        )

      await loadLoans()
      onLoanSummaryChange(result.loanSummary)

      resetRegistrationForm()
      setRegistrationOpen(false)
      setMessage(
        `El equipo ${equipmentCode.trim().toUpperCase()} quedó registrado como prestado.`,
      )
    } catch (registrationError: unknown) {
      setError(
        getErrorMessage(
          registrationError,
          'No fue posible registrar el préstamo.',
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReturnLoan(
    loan: SalesNoteLoan,
  ): Promise<void> {
    if (!userId) {
      return
    }

    setSubmitting(true)
    setError('')
    setMessage('')

    try {
      const result =
        await returnSalesNoteLoan(
          businessId,
          noteId,
          loan.id,
          userId,
          returnNotes,
        )

      await loadLoans()
      onLoanSummaryChange(result.loanSummary)

      setReturningLoanId(null)
      setReturnNotes('')
      setMessage(
        `El equipo ${loan.equipmentCode} quedó registrado como devuelto.`,
      )
    } catch (returnError: unknown) {
      setError(
        getErrorMessage(
          returnError,
          'No fue posible registrar la devolución.',
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <h2>Extintores en préstamo</h2>

      <p>
        Total registrado: {loans.length}.{' '}
        Activos:{' '}
        {
          loans.filter(
            (loan) => loan.status === 'active',
          ).length
        }.
      </p>

      {message && (
        <p role="status">{message}</p>
      )}

      {error && (
        <p role="alert">{error}</p>
      )}

      {loading && (
        <p>Cargando préstamos...</p>
      )}

      {!loading &&
        loans.length === 0 && (
          <p>
            Esta nota no tiene extintores
            prestados.
          </p>
        )}

      {canManage &&
        userId &&
        documentStatus === 'issued' &&
        !registrationOpen && (
          <p>
            <button
              type="button"
              onClick={() => {
                setRegistrationOpen(true)
                setError('')
                setMessage('')
              }}
            >
              Registrar préstamo
            </button>
          </p>
        )}

      {registrationOpen && (
        <form onSubmit={handleRegisterLoan}>
          <fieldset disabled={submitting}>
            <legend>Registrar préstamo</legend>

            <label>
              Código del equipo
              <input
                required
                maxLength={40}
                value={equipmentCode}
                placeholder="ACPA-P-001"
                onChange={(event) =>
                  setEquipmentCode(
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              Motivo
              <select
                value={reason}
                onChange={(event) =>
                  setReason(
                    event.target
                      .value as SalesNoteLoanReason,
                  )
                }
              >
                {SALES_NOTE_LOAN_REASONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              Agente
              <select
                value={agent}
                onChange={(event) =>
                  setAgent(
                    event.target
                      .value as ExtinguisherAgent,
                  )
                }
              >
                {EXTINGUISHER_AGENTS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              Unidad
              <select
                value={capacityUnit}
                onChange={(event) => {
                  const nextUnit =
                    event.target
                      .value as CapacityUnit

                  setCapacityUnit(nextUnit)
                  setCapacityValue(
                    CAPACITIES[nextUnit][0],
                  )
                }}
              >
                {CAPACITY_UNITS.map((unit) => (
                  <option
                    key={unit.value}
                    value={unit.value}
                  >
                    {unit.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Capacidad
              <select
                value={capacityValue}
                onChange={(event) =>
                  setCapacityValue(
                    Number(event.target.value),
                  )
                }
              >
                {CAPACITIES[capacityUnit].map(
                  (capacity) => (
                    <option
                      key={capacity}
                      value={capacity}
                    >
                      {capacity} {capacityUnit}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              Condición de salida
              <textarea
                required
                maxLength={500}
                rows={3}
                value={outgoingCondition}
                placeholder="Estado físico del equipo al entregarlo"
                onChange={(event) =>
                  setOutgoingCondition(
                    event.target.value,
                  )
                }
              />
            </label>

            <p>
              <button type="submit">
                {submitting
                  ? 'Registrando...'
                  : 'Confirmar préstamo'}
              </button>{' '}

              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  resetRegistrationForm()
                  setRegistrationOpen(false)
                  setError('')
                }}
              >
                Cerrar
              </button>
            </p>
          </fieldset>
        </form>
      )}

      {loans.map((loan) => (
        <fieldset key={loan.id}>
          <legend>{loan.equipmentCode}</legend>

          <dl>
            <dt>Motivo</dt>
            <dd>
              {findLabel(
                SALES_NOTE_LOAN_REASONS,
                loan.reason,
              )}
            </dd>

            <dt>Equipo</dt>
            <dd>
              {findLabel(
                EXTINGUISHER_AGENTS,
                loan.agent,
              )}
              {' · '}
              {loan.capacityValue}{' '}
              {loan.capacityUnit}
            </dd>

            <dt>Condición de salida</dt>
            <dd>{loan.outgoingCondition}</dd>

            <dt>Estado</dt>
            <dd>
              {loan.status === 'active'
                ? 'Prestado'
                : 'Devuelto'}
            </dd>

            <dt>Prestado</dt>
            <dd>
              {formatTimestamp(loan.loanedAt)}
              {' · '}
              {memberNames[loan.loanedBy] ??
                loan.loanedBy}
            </dd>

            {loan.status === 'returned' &&
              loan.returnedAt &&
              loan.returnedBy && (
                <>
                  <dt>Devuelto</dt>
                  <dd>
                    {formatTimestamp(
                      loan.returnedAt,
                    )}
                    {' · '}
                    {memberNames[
                      loan.returnedBy
                    ] ?? loan.returnedBy}
                  </dd>

                  <dt>
                    Observaciones de devolución
                  </dt>
                  <dd>
                    {loan.returnNotes ||
                      'Sin observaciones'}
                  </dd>
                </>
              )}
          </dl>

          {canManage &&
            userId &&
            loan.status === 'active' &&
            returningLoanId !== loan.id && (
              <p>
                <button
                  type="button"
                  onClick={() => {
                    setReturningLoanId(loan.id)
                    setReturnNotes('')
                    setError('')
                    setMessage('')
                  }}
                >
                  Registrar devolución
                </button>
              </p>
            )}

          {returningLoanId === loan.id && (
            <div>
              <label>
                Observaciones de devolución
                <textarea
                  maxLength={500}
                  rows={3}
                  value={returnNotes}
                  placeholder="Opcional"
                  disabled={submitting}
                  onChange={(event) =>
                    setReturnNotes(
                      event.target.value,
                    )
                  }
                />
              </label>

              <p>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() =>
                    void handleReturnLoan(loan)
                  }
                >
                  {submitting
                    ? 'Registrando...'
                    : 'Confirmar devolución'}
                </button>{' '}

                <button
                  type="button"
                  className="button-secondary"
                  disabled={submitting}
                  onClick={() => {
                    setReturningLoanId(null)
                    setReturnNotes('')
                    setError('')
                  }}
                >
                  Cerrar
                </button>
              </p>
            </div>
          )}
        </fieldset>
      ))}
    </section>
  )
}
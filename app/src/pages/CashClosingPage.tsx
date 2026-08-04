import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import {
  getCashMovements,
  registerCashOutflow,
} from '../services/cashMovementService'
import { getMemberDisplayNames } from '../services/memberService'
import type {
  CashMovement,
  RegisterCashOutflowInput,
} from '../types/cashMovement'
import { canManageSalesNotes } from '../types/member'
import {
  calculateCashDailySummary,
  getBusinessDate,
} from '../utils/cashMovement'
import {
  formatMoneyFromCents,
  parseMoneyToCents,
} from '../utils/money'

const MOVEMENT_LABELS: Record<CashMovement['type'], string> = {
  income: 'Ingreso por venta',
  expense: 'Gasto operativo',
  owner_withdrawal: 'Retiro de dueño',
}

const PAYMENT_METHOD_LABELS: Record<
  CashMovement['paymentMethod'],
  string
> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
}

function formatBusinessDate(businessDate: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'full',
  }).format(new Date(`${businessDate}T12:00:00`))
}

function formatTime(movement: CashMovement): string {
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(movement.occurredAt.toDate())
}

export function CashClosingPage() {
  const { user, member } = useAuth()
  const businessDate = useMemo(() => getBusinessDate(), [])
  const [movements, setMovements] = useState<CashMovement[]>([])
  const [memberNames, setMemberNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [type, setType] = useState<RegisterCashOutflowInput['type']>('expense')
  const [concept, setConcept] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [amount, setAmount] = useState('')
  const [observations, setObservations] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadMovements = useCallback(async () => {
    if (!member) return

    setLoading(true)
    setError('')

    try {
      const nextMovements = await getCashMovements(
        member.businessId,
        businessDate,
      )
      const names = await getMemberDisplayNames(
        member.businessId,
        nextMovements.map((movement) => movement.createdBy),
      )

      setMovements(nextMovements)
      setMemberNames(names)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'No fue posible cargar el corte de caja.',
      )
    } finally {
      setLoading(false)
    }
  }, [businessDate, member])

  useEffect(() => {
    if (!member) return

    let cancelled = false

    getCashMovements(member.businessId, businessDate)
      .then(async (nextMovements) => ({
        nextMovements,
        names: await getMemberDisplayNames(
          member.businessId,
          nextMovements.map((movement) => movement.createdBy),
        ),
      }))
      .then(({ nextMovements, names }) => {
        if (!cancelled) {
          setMovements(nextMovements)
          setMemberNames(names)
        }
      })
      .catch((caughtError: unknown) => {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : 'No fue posible cargar el corte de caja.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [businessDate, member])

  const summary = useMemo(
    () => calculateCashDailySummary(movements),
    [movements],
  )
  const canRegisterOutflow = member
    ? canManageSalesNotes(member.role)
    : false

  function resetForm() {
    setFormOpen(false)
    setType('expense')
    setConcept('')
    setQuantity('1')
    setAmount('')
    setObservations('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!member || !user) return

    setSubmitting(true)
    setError('')
    setMessage('')

    try {
      if (
        type === 'owner_withdrawal' &&
        !['owner', 'admin'].includes(member.role)
      ) {
        throw new Error(
          'Solo el dueño o la administradora pueden registrar retiros personales.',
        )
      }

      const parsedQuantity = Number(quantity)

      await registerCashOutflow(
        member.businessId,
        user.uid,
        businessDate,
        {
          type,
          concept,
          quantity: parsedQuantity,
          amountCents: parseMoneyToCents(amount),
          observations,
        },
      )

      resetForm()
      setMessage('Salida registrada correctamente.')
      await loadMovements()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'No fue posible registrar la salida.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!member) {
    return (
      <main>
        <p role="alert">Necesitas una membresía activa para consultar la caja.</p>
      </main>
    )
  }

  return (
    <main className="cash-closing-page">
      <header className="cash-closing-header">
        <div>
          <span className="page-eyebrow">Control financiero diario</span>
          <h1>Corte de caja</h1>
          <p>{formatBusinessDate(businessDate)}</p>
        </div>

        {canRegisterOutflow && (
          <button
            type="button"
            onClick={() => {
              setFormOpen(true)
              setError('')
              setMessage('')
            }}
          >
            Registrar salida / gasto
          </button>
        )}
      </header>

      <section className="cash-summary" aria-labelledby="cash-summary-title">
        <h2 id="cash-summary-title">Resumen del día</h2>

        <dl className="cash-summary-grid">
          <div>
            <dt>Ingresos en efectivo</dt>
            <dd className="cash-amount--positive">
              +{formatMoneyFromCents(summary.cashIncomeCents)}
            </dd>
          </div>
          <div>
            <dt>Egresos y retiros</dt>
            <dd className="cash-amount--negative">
              −{formatMoneyFromCents(summary.totalOutflowCents)}
            </dd>
          </div>
          <div className="cash-summary-total">
            <dt>Efectivo estimado en caja</dt>
            <dd>{summary.estimatedCashCents < 0 ? '−' : ''}{formatMoneyFromCents(Math.abs(summary.estimatedCashCents))}</dd>
          </div>
          <div>
            <dt>Transferencias y tarjeta</dt>
            <dd>{formatMoneyFromCents(summary.electronicIncomeCents)}</dd>
          </div>
        </dl>

        <p className="cash-summary-detail">
          Gastos: {formatMoneyFromCents(summary.expenseCents)} · Retiros: {formatMoneyFromCents(summary.withdrawalCents)}
        </p>
      </section>

      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}

      {formOpen && (
        <section aria-labelledby="cash-outflow-title">
          <h2 id="cash-outflow-title">Nueva salida de caja</h2>

          <form onSubmit={handleSubmit}>
            <fieldset disabled={submitting} className="cash-form-grid">
              <label>
                Tipo de salida
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value as RegisterCashOutflowInput['type'])}
                >
                  <option value="expense">Gasto operativo</option>
                  {['owner', 'admin'].includes(member.role) && (
                    <option value="owner_withdrawal">Retiro de dueño</option>
                  )}
                </select>
              </label>

              <label className="cash-form-concept">
                Concepto
                <input
                  value={concept}
                  maxLength={200}
                  onChange={(event) => setConcept(event.target.value)}
                  placeholder="Ej. Compra de thinner"
                  required
                />
              </label>

              <label>
                Cantidad
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  required
                />
              </label>

              <label>
                Monto total
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  required
                />
              </label>

              <label className="cash-form-observations">
                Observaciones
                <textarea
                  value={observations}
                  maxLength={500}
                  onChange={(event) => setObservations(event.target.value)}
                  placeholder="Opcional"
                />
              </label>

              <p className="cash-form-responsible">
                Responsable: <strong>{member.displayName}</strong>
              </p>

              <div className="cash-form-actions">
                <button type="button" className="button-secondary" onClick={resetForm}>
                  Cancelar
                </button>
                <button type="submit">
                  {submitting ? 'Registrando...' : 'Registrar salida'}
                </button>
              </div>
            </fieldset>
          </form>
        </section>
      )}

      <section aria-labelledby="cash-movements-title">
        <div className="cash-table-heading">
          <div>
            <h2 id="cash-movements-title">Movimientos del día</h2>
            <p>{movements.length} operaciones registradas</p>
          </div>
          <button type="button" className="button-secondary" disabled={loading} onClick={() => void loadMovements()}>
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        {!loading && movements.length === 0 ? (
          <p>No hay movimientos registrados hoy.</p>
        ) : (
        <div className="cash-table-scroll">
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Hora</th>
                <th>Folio</th>
                <th>Tipo</th>
                <th>Concepto</th>
                <th>Cantidad</th>
                <th>Método</th>
                <th>Monto</th>
                <th>Responsable</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement, index) => (
                <tr key={movement.id}>
                  <td>{index + 1}</td>
                  <td>{formatTime(movement)}</td>
                  <td>
                    {movement.noteId ? (
                      <Link to={`/sales/${movement.noteId}`}>{movement.folioDisplay}</Link>
                    ) : '—'}
                  </td>
                  <td>{MOVEMENT_LABELS[movement.type]}</td>
                  <td>{movement.concept}</td>
                  <td>{movement.quantity}</td>
                  <td>{PAYMENT_METHOD_LABELS[movement.paymentMethod]}</td>
                  <td className={movement.type === 'income' ? 'cash-amount--positive' : 'cash-amount--negative'}>
                    {movement.type === 'income' ? '+' : '−'}{formatMoneyFromCents(movement.amountCents)}
                  </td>
                  <td>{memberNames[movement.createdBy] ?? movement.createdBy}</td>
                  <td>{movement.observations || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </section>
    </main>
  )
}

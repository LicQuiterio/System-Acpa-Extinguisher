import { useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { setSalesClientActive } from '../services/salesClientService'
import {
  getSalesClientDisplayName,
  type SalesClient,
} from '../types/client'
import { canManageSalesNotes } from '../types/member'

type SalesClientDetailsProps = {
  client: SalesClient
  onUpdated: () => void | Promise<void>
}

export function SalesClientDetails({
  client,
  onUpdated,
}: SalesClientDetailsProps) {
  const { user, member } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const canManage =
    member !== null &&
    canManageSalesNotes(member.role)

  async function handleStatusChange() {
    if (!member || !user) return

    setSaving(true)
    setError('')

    try {
      await setSalesClientActive(
        member.businessId,
        client.id,
        user.uid,
        !client.active,
      )

      await onUpdated()
    } catch {
      setError(
        'No fue posible cambiar el estado del cliente',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <header>
        <h1>
          {getSalesClientDisplayName(client)}
        </h1>
        <p>
          Estado:{' '}
          {client.active ? 'Activo' : 'Inactivo'}
        </p>
      </header>

      <section>
        <h2>Información del cliente</h2>

        <dl>
          <dt>Tipo</dt>
          <dd>
            {client.type === 'company'
              ? 'Empresa'
              : 'Particular'}
          </dd>

          {client.type === 'company' && (
            <>
              <dt>Empresa</dt>
              <dd>{client.companyName}</dd>
            </>
          )}

          <dt>Contacto</dt>
          <dd>{client.contactName}</dd>

          <dt>Teléfono</dt>
          <dd>{client.phone}</dd>

          <dt>Correo electrónico</dt>
          <dd>
            {client.email || 'No registrado'}
          </dd>

          <dt>Dirección</dt>
          <dd>{client.address}</dd>

          <dt>Zona o comunidad</dt>
          <dd>
            {
              client.serviceAreaSnapshot
                .displayName
            }
          </dd>
        </dl>

        {canManage && (
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              void handleStatusChange()
            }
          >
            {saving
              ? 'Guardando...'
              : client.active
                ? 'Desactivar cliente'
                : 'Activar cliente'}
          </button>
        )}

        {error && <p role="alert">{error}</p>}
      </section>
    </>
  )
}
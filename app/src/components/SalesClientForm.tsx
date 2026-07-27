import {
  useState,
  type FormEvent,
} from 'react'
import { createSalesClient } from '../services/salesClientService'
import type {
  ClientType,
  SalesClientInput,
} from '../types/client'
import type { ServiceArea } from '../types/serviceArea'
import { ServiceAreaCombobox } from './ServiceAreaCombobox'

type SalesClientFormProps = {
  businessId: string
  userId: string
  onCreated: (
    clientId: string,
  ) => void | Promise<void>
  onCancel: () => void
}

type ClientFormState = {
  type: ClientType
  companyName: string
  contactName: string
  phone: string
  email: string
  address: string
}

const EMPTY_FORM: ClientFormState = {
  type: 'individual',
  companyName: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
}

export function SalesClientForm({
  businessId,
  userId,
  onCreated,
  onCancel,
}: SalesClientFormProps) {
  const [form, setForm] =
    useState<ClientFormState>(EMPTY_FORM)
  const [serviceArea, setServiceArea] =
    useState<ServiceArea | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function updateField(
    field: keyof ClientFormState,
    value: string,
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
    setError('')
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (
      form.type === 'company' &&
      !form.companyName.trim()
    ) {
      setError(
        'El nombre de la empresa es obligatorio',
      )
      return
    }

    if (!form.contactName.trim()) {
      setError(
        'El nombre del contacto es obligatorio',
      )
      return
    }

    if (!form.phone.trim()) {
      setError('El teléfono es obligatorio')
      return
    }

    if (!form.address.trim()) {
      setError('La dirección es obligatoria')
      return
    }

    if (!serviceArea) {
      setError(
        'Selecciona una zona o comunidad',
      )
      return
    }

    const input: SalesClientInput = {
      type: form.type,
      companyName: form.companyName,
      contactName: form.contactName,
      phone: form.phone,
      email: form.email,
      address: form.address,
      serviceArea: {
        serviceAreaId: serviceArea.id,
        municipality: serviceArea.municipality,
        locality: serviceArea.locality,
        displayName: serviceArea.displayName,
      },
    }

    setSaving(true)
    setError('')

    try {
      const clientId = await createSalesClient(
        businessId,
        userId,
        input,
      )

      setForm(EMPTY_FORM)
      setServiceArea(null)

      await onCreated(clientId)
    } catch {
      setError(
        'No fue posible registrar el cliente',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h2>Registrar cliente</h2>

      <form onSubmit={handleSubmit}>
        <label htmlFor="client-type">
          Tipo de cliente
        </label>
        <select
          id="client-type"
          value={form.type}
          disabled={saving}
          onChange={(event) =>
            updateField(
              'type',
              event.target.value as ClientType,
            )
          }
        >
          <option value="individual">
            Particular
          </option>
          <option value="company">
            Empresa
          </option>
        </select>

        {form.type === 'company' && (
          <>
            <label htmlFor="company-name">
              Nombre de la empresa *
            </label>
            <input
              id="company-name"
              value={form.companyName}
              disabled={saving}
              onChange={(event) =>
                updateField(
                  'companyName',
                  event.target.value,
                )
              }
            />
          </>
        )}

        <label htmlFor="contact-name">
          Nombre del contacto *
        </label>
        <input
          id="contact-name"
          value={form.contactName}
          disabled={saving}
          onChange={(event) =>
            updateField(
              'contactName',
              event.target.value,
            )
          }
        />

        <label htmlFor="client-phone">
          Teléfono *
        </label>
        <input
          id="client-phone"
          type="tel"
          value={form.phone}
          disabled={saving}
          onChange={(event) =>
            updateField(
              'phone',
              event.target.value,
            )
          }
        />

        <label htmlFor="client-email">
          Correo electrónico
        </label>
        <input
          id="client-email"
          type="email"
          value={form.email}
          disabled={saving}
          onChange={(event) =>
            updateField(
              'email',
              event.target.value,
            )
          }
        />

        <label htmlFor="client-address">
          Dirección *
        </label>
        <textarea
          id="client-address"
          value={form.address}
          disabled={saving}
          onChange={(event) =>
            updateField(
              'address',
              event.target.value,
            )
          }
        />

        <ServiceAreaCombobox
          businessId={businessId}
          userId={userId}
          value={serviceArea}
          disabled={saving}
          onChange={(area) => {
            setServiceArea(area)
            setError('')
          }}
        />

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={saving}>
          {saving
            ? 'Guardando...'
            : 'Guardar cliente'}
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
        >
          Cancelar
        </button>
      </form>
    </section>
  )
}
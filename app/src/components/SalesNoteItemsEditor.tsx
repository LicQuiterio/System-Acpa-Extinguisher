import {
  CAPACITIES,
  CAPACITY_UNITS,
  EXTINGUISHER_AGENTS,
  EXTINGUISHER_SERVICES,
  GENERAL_PRODUCT_SUGGESTIONS,
  type CapacityUnit,
  type ExtinguisherAgent,
  type ExtinguisherService,
} from '../constants/sales'
import type {
  ExtinguisherServiceItemDraft,
  GeneralProductItemDraft,
  SalesNoteItemDraft,
} from '../types/salesNoteDraft'
import { formatMoneyFromCents } from '../utils/money'
import {
  convertItemDraft,
  createExtinguisherItemDraft,
  createGeneralProductItemDraft,
} from '../utils/salesNoteDraft'

type SalesNoteItemsEditorProps = {
  items: SalesNoteItemDraft[]
  onChange: (items: SalesNoteItemDraft[]) => void
  disabled?: boolean
}

function getLineTotal(
  item: SalesNoteItemDraft,
): string {
  try {
    return formatMoneyFromCents(
      convertItemDraft(item).lineSubtotalCents,
    )
  } catch {
    return '—'
  }
}

export function SalesNoteItemsEditor({
  items,
  onChange,
  disabled = false,
}: SalesNoteItemsEditorProps) {
  function updateExtinguisherItem(
    id: string,
    patch: Partial<ExtinguisherServiceItemDraft>,
  ) {
    onChange(
      items.map((item) =>
        item.id === id &&
        item.type === 'extinguisher_service'
          ? { ...item, ...patch }
          : item,
      ),
    )
  }

  function updateProductItem(
    id: string,
    patch: Partial<GeneralProductItemDraft>,
  ) {
    onChange(
      items.map((item) =>
        item.id === id &&
        item.type === 'general_product'
          ? { ...item, ...patch }
          : item,
      ),
    )
  }

  function removeItem(id: string) {
    onChange(
      items.filter((item) => item.id !== id),
    )
  }

  return (
    <section>
      <h2>Conceptos</h2>

      {items.length === 0 && (
        <p>
          Agrega al menos un servicio o producto.
        </p>
      )}

      {items.map((item, index) => (
        <fieldset key={item.id} disabled={disabled}>
          <legend>
            Concepto {index + 1}:{' '}
            {item.type === 'extinguisher_service'
              ? 'Servicio de extintor'
              : 'Otro producto'}
          </legend>

          {item.type ===
            'extinguisher_service' && (
            <>
              <label>
                Servicio
                <select
                  value={item.service}
                  onChange={(event) =>
                    updateExtinguisherItem(
                      item.id,
                      {
                        service:
                          event.target
                            .value as ExtinguisherService,
                      },
                    )
                  }
                >
                  {EXTINGUISHER_SERVICES.map(
                    (service) => (
                      <option
                        key={service.value}
                        value={service.value}
                      >
                        {service.label}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                Agente
                <select
                  value={item.agent}
                  onChange={(event) =>
                    updateExtinguisherItem(
                      item.id,
                      {
                        agent:
                          event.target
                            .value as ExtinguisherAgent,
                      },
                    )
                  }
                >
                  {EXTINGUISHER_AGENTS.map(
                    (agent) => (
                      <option
                        key={agent.value}
                        value={agent.value}
                      >
                        {agent.label}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                Unidad
                <select
                  value={item.capacityUnit}
                  onChange={(event) => {
                    const capacityUnit =
                      event.target
                        .value as CapacityUnit

                    updateExtinguisherItem(
                      item.id,
                      {
                        capacityUnit,
                        capacityValue:
                          CAPACITIES[
                            capacityUnit
                          ][0],
                      },
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
                  value={item.capacityValue}
                  onChange={(event) =>
                    updateExtinguisherItem(
                      item.id,
                      {
                        capacityValue:
                          Number(
                            event.target.value,
                          ),
                      },
                    )
                  }
                >
                  {CAPACITIES[
                    item.capacityUnit
                  ].map((capacity) => (
                    <option
                      key={capacity}
                      value={capacity}
                    >
                      {capacity}{' '}
                      {item.capacityUnit}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {item.type === 'general_product' && (
            <label>
              Descripción
              <input
                list="general-product-suggestions"
                value={item.description}
                onChange={(event) =>
                  updateProductItem(item.id, {
                    description:
                      event.target.value,
                  })
                }
              />
            </label>
          )}

          <label>
            Cantidad
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={item.quantity}
              onChange={(event) => {
                if (
                  item.type ===
                  'extinguisher_service'
                ) {
                  updateExtinguisherItem(
                    item.id,
                    {
                      quantity:
                        event.target.value,
                    },
                  )
                } else {
                  updateProductItem(item.id, {
                    quantity:
                      event.target.value,
                  })
                }
              }}
            />
          </label>

          <label>
            Precio unitario
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={item.unitPrice}
              onChange={(event) => {
                if (
                  item.type ===
                  'extinguisher_service'
                ) {
                  updateExtinguisherItem(
                    item.id,
                    {
                      unitPrice:
                        event.target.value,
                    },
                  )
                } else {
                  updateProductItem(item.id, {
                    unitPrice:
                      event.target.value,
                  })
                }
              }}
            />
          </label>

          <label>
            Notas u observaciones
            <textarea
              value={item.notes}
              onChange={(event) => {
                if (
                  item.type ===
                  'extinguisher_service'
                ) {
                  updateExtinguisherItem(
                    item.id,
                    {
                      notes: event.target.value,
                    },
                  )
                } else {
                  updateProductItem(item.id, {
                    notes: event.target.value,
                  })
                }
              }}
            />
          </label>

          <p>
            Importe: <strong>{getLineTotal(item)}</strong>
          </p>

          <button
            type="button"
            onClick={() => removeItem(item.id)}
          >
            Eliminar concepto
          </button>
        </fieldset>
      ))}

      <datalist id="general-product-suggestions">
        {GENERAL_PRODUCT_SUGGESTIONS.map(
          (suggestion) => (
            <option
              key={suggestion}
              value={suggestion}
            />
          ),
        )}
      </datalist>

      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onChange([
            ...items,
            createExtinguisherItemDraft(),
          ])
        }
      >
        + Agregar servicio de extintor
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onChange([
            ...items,
            createGeneralProductItemDraft(),
          ])
        }
      >
        + Agregar otro producto
      </button>
    </section>
  )
}
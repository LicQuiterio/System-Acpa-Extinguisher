import '../../styles/salesNote/SalesNoteItemActions.css'

type SalesNoteItemActionsProps = {
  disabled: boolean
  onAddExtinguisherService: () => void
  onAddGeneralProduct: () => void
}

export function SalesNoteItemActions({
  disabled,
  onAddExtinguisherService,
  onAddGeneralProduct,
}: SalesNoteItemActionsProps) {
  return (
    <div
      className="sales-note-item-actions"
      role="group"
      aria-label="Agregar concepto"
    >
      <button
        type="button"
        className={[
          'sales-note-item-action',
          'sales-note-item-action--primary',
        ].join(' ')}
        disabled={disabled}
        onClick={onAddExtinguisherService}
      >
        <span className="sales-note-item-action__eyebrow">
          Servicio
        </span>

        <span className="sales-note-item-action__content">
          <strong>
            Agregar servicio de extintor
          </strong>

          <span>
            Recarga, mantenimiento, prueba
            hidrostática o venta.
          </span>
        </span>

        <span
          className="sales-note-item-action__symbol"
          aria-hidden="true"
        >
          +
        </span>
      </button>

      <button
        type="button"
        className="sales-note-item-action"
        disabled={disabled}
        onClick={onAddGeneralProduct}
      >
        <span className="sales-note-item-action__eyebrow">
          Producto
        </span>

        <span className="sales-note-item-action__content">
          <strong>Agregar otro producto</strong>

          <span>
            Refacciones, señalización u otro
            producto general.
          </span>
        </span>

        <span
          className="sales-note-item-action__symbol"
          aria-hidden="true"
        >
          +
        </span>
      </button>
    </div>
  )
}
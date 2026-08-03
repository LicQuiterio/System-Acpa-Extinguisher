import { createWhatsAppUrl } from '../utils/whatsapp'

type WhatsAppClientLinkProps = {
  phone: string
  message: string
}

export function WhatsAppClientLink({
  phone,
  message,
}: WhatsAppClientLinkProps) {
  const url = createWhatsAppUrl(phone, message)

  if (!url) {
    return (
      <p role="alert">
        El teléfono del cliente no tiene un formato
        válido para WhatsApp.
      </p>
    )
  }

  return (
    <div>
      <p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
        >
          Abrir WhatsApp del cliente
        </a>
      </p>

      <p>
        Guarda primero el documento como PDF y
        adjúntalo manualmente antes de enviar el
        mensaje.
      </p>
    </div>
  )
}
const MEXICO_COUNTRY_CODE = '52'
const MEXICO_LOCAL_NUMBER_LENGTH = 10

export function normalizeMexicanWhatsAppPhone(
  phone: string,
): string | null {
  const digits = phone.replace(/\D/g, '')

  if (
    digits.length ===
    MEXICO_LOCAL_NUMBER_LENGTH
  ) {
    return `${MEXICO_COUNTRY_CODE}${digits}`
  }

  if (
    digits.length === 12 &&
    digits.startsWith(MEXICO_COUNTRY_CODE)
  ) {
    return digits
  }

  if (
    digits.length === 13 &&
    digits.startsWith('521')
  ) {
    return `${MEXICO_COUNTRY_CODE}${digits.slice(
      3,
    )}`
  }

  return null
}

export function createWhatsAppUrl(
  phone: string,
  message: string,
): string | null {
  const normalizedPhone =
    normalizeMexicanWhatsAppPhone(phone)

  if (!normalizedPhone) {
    return null
  }

  const url = new URL(
    `https://wa.me/${normalizedPhone}`,
  )

  url.searchParams.set('text', message)

  return url.toString()
}
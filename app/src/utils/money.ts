function assertValidCents(cents: number): void {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError(
      'El importe debe ser un entero no negativo en centavos',
    )
  }
}

export function parseMoneyToCents(
  value: string,
): number {
  let normalizedValue = value
    .trim()
    .replace(/\$/g, '')
    .replace(/MXN/gi, '')
    .replace(/\s/g, '')

  if (!normalizedValue) {
    throw new Error('El importe es obligatorio')
  }

  if (
    normalizedValue.includes(',') &&
    normalizedValue.includes('.')
  ) {
    normalizedValue =
      normalizedValue.replace(/,/g, '')
  } else if (normalizedValue.includes(',')) {
    const decimalCommaPattern =
      /^\d+,\d{1,2}$/

    normalizedValue =
      decimalCommaPattern.test(normalizedValue)
        ? normalizedValue.replace(',', '.')
        : normalizedValue.replace(/,/g, '')
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalizedValue)) {
    throw new Error(
      'Escribe un importe válido con máximo dos decimales',
    )
  }

  const [wholePart, decimalPart = ''] =
    normalizedValue.split('.')

  const cents =
    Number(wholePart) * 100 +
    Number(decimalPart.padEnd(2, '0'))

  assertValidCents(cents)

  return cents
}

export function formatMoneyFromCents(
  cents: number,
): string {
  assertValidCents(cents)

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function formatCentsForInput(
  cents: number,
): string {
  assertValidCents(cents)

  return (cents / 100).toFixed(2)
}
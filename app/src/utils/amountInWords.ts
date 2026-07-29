const SMALL_NUMBERS = [
  'CERO',
  'UNO',
  'DOS',
  'TRES',
  'CUATRO',
  'CINCO',
  'SEIS',
  'SIETE',
  'OCHO',
  'NUEVE',
  'DIEZ',
  'ONCE',
  'DOCE',
  'TRECE',
  'CATORCE',
  'QUINCE',
  'DIECISÉIS',
  'DIECISIETE',
  'DIECIOCHO',
  'DIECINUEVE',
  'VEINTE',
  'VEINTIUNO',
  'VEINTIDÓS',
  'VEINTITRÉS',
  'VEINTICUATRO',
  'VEINTICINCO',
  'VEINTISÉIS',
  'VEINTISIETE',
  'VEINTIOCHO',
  'VEINTINUEVE',
] as const

const TENS = [
  '',
  '',
  '',
  'TREINTA',
  'CUARENTA',
  'CINCUENTA',
  'SESENTA',
  'SETENTA',
  'OCHENTA',
  'NOVENTA',
] as const

const HUNDREDS = [
  '',
  'CIENTO',
  'DOSCIENTOS',
  'TRESCIENTOS',
  'CUATROCIENTOS',
  'QUINIENTOS',
  'SEISCIENTOS',
  'SETECIENTOS',
  'OCHOCIENTOS',
  'NOVECIENTOS',
] as const

function apocopateOne(words: string): string {
  return words
    .replace(/VEINTIUNO$/, 'VEINTIÚN')
    .replace(/ Y UNO$/, ' Y UN')
    .replace(/UNO$/, 'UN')
}

function convertUnderHundred(
  value: number,
): string {
  if (value < 30) {
    return SMALL_NUMBERS[value]
  }

  const tens = Math.floor(value / 10)
  const units = value % 10

  if (units === 0) {
    return TENS[tens]
  }

  return `${TENS[tens]} Y ${SMALL_NUMBERS[units]}`
}

function convertUnderThousand(
  value: number,
  apocopate: boolean,
): string {
  if (value === 100) {
    return 'CIEN'
  }

  const hundreds = Math.floor(value / 100)
  const remainder = value % 100

  const parts: string[] = []

  if (hundreds > 0) {
    parts.push(HUNDREDS[hundreds])
  }

  if (remainder > 0) {
    parts.push(convertUnderHundred(remainder))
  }

  const words = parts.join(' ')

  return apocopate
    ? apocopateOne(words)
    : words
}

function convertUnderMillion(
  value: number,
  apocopate: boolean,
): string {
  const thousands = Math.floor(value / 1000)
  const remainder = value % 1000

  const parts: string[] = []

  if (thousands === 1) {
    parts.push('MIL')
  } else if (thousands > 1) {
    parts.push(
      `${convertUnderThousand(
        thousands,
        true,
      )} MIL`,
    )
  }

  if (remainder > 0) {
    parts.push(
      convertUnderThousand(
        remainder,
        apocopate,
      ),
    )
  }

  return parts.join(' ')
}

function convertPesos(value: number): string {
  if (value === 0) {
    return 'CERO'
  }

  const millions = Math.floor(
    value / 1_000_000,
  )
  const remainder = value % 1_000_000

  const parts: string[] = []

  if (millions === 1) {
    parts.push('UN MILLÓN')
  } else if (millions > 1) {
    parts.push(
      `${convertUnderThousand(
        millions,
        true,
      )} MILLONES`,
    )
  }

  if (remainder > 0) {
    parts.push(
      convertUnderMillion(remainder, true),
    )
  }

  return parts.join(' ')
}

export function formatAmountInWords(
  totalCents: number,
): string {
  if (
    !Number.isSafeInteger(totalCents) ||
    totalCents < 0
  ) {
    throw new Error(
      'El total debe expresarse en centavos enteros',
    )
  }

  if (totalCents > 99_999_999_999) {
    throw new Error(
      'El total es demasiado grande para convertirlo',
    )
  }

  const pesos = Math.floor(totalCents / 100)
  const cents = totalCents % 100

  const words = convertPesos(pesos)
  const currency =
    pesos === 1 ? 'PESO' : 'PESOS'

  const requiresDe =
    pesos >= 1_000_000 &&
    pesos % 1_000_000 === 0

  return [
    words,
    requiresDe ? 'DE' : '',
    currency,
    String(cents).padStart(2, '0') +
      '/100 M.N.',
  ]
    .filter(Boolean)
    .join(' ')
}
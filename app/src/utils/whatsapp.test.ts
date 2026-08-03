import {
  describe,
  expect,
  it,
} from 'vitest'
import {
  createWhatsAppUrl,
  normalizeMexicanWhatsAppPhone,
} from './whatsapp'

describe('normalizeMexicanWhatsAppPhone', () => {
  it('normaliza números mexicanos comunes', () => {
    expect(
      normalizeMexicanWhatsAppPhone(
        '983 123 4567',
      ),
    ).toBe('529831234567')

    expect(
      normalizeMexicanWhatsAppPhone(
        '+52 983 123 4567',
      ),
    ).toBe('529831234567')

    expect(
      normalizeMexicanWhatsAppPhone(
        '+52 1 983 123 4567',
      ),
    ).toBe('529831234567')
  })

  it('rechaza números incompletos', () => {
    expect(
      normalizeMexicanWhatsAppPhone('12345'),
    ).toBeNull()
  })
})

describe('createWhatsAppUrl', () => {
  it('prepara el número y el mensaje', () => {
    const value = createWhatsAppUrl(
      '983 123 4567',
      'Hola, te comparto tu cotización.',
    )

    expect(value).not.toBeNull()

    const url = new URL(value!)

    expect(url.pathname).toBe('/529831234567')
    expect(url.searchParams.get('text')).toBe(
      'Hola, te comparto tu cotización.',
    )
  })
})
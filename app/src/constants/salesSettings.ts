import type { SalesNoteTerms } from '../types/salesNote'

export const INITIAL_SALES_FOLIO = 9600

export const QUOTATION_VALIDITY = '15 días'

export const DEFAULT_SALES_TERMS: SalesNoteTerms = {
  deliveryTime: '24 a 48 horas',
  warranty:
  'Según el producto o servicio contratado. Consulte las condiciones aplicables con ACPA Extintores.',
  clauses: [
    'RECARGA SUJETA AL ESTADO DEL CILINDRO',
    'NO INCLUYE REFACCIONES NO DESGLOSADAS',
    'ETIQUETA / REGISTRO DE SERVICIO',
    'ACCESO AL INMUEBLE',
  ],
  additionalCondition: '',
}
import type { SalesNoteTerms } from '../types/salesNote'

export const INITIAL_SALES_FOLIO = 9600

export const QUOTATION_VALIDITY = '15 días'

export const DEFAULT_SALES_TERMS: SalesNoteTerms = {
  deliveryTime: '24 a 48 horas',
  warranty: '1 año',
  clauses: [
    'RECARGA SUJETA AL ESTADO DEL CILINDRO',
    'NO INCLUYE REFACCIONES NO DESGLOSADAS',
    'ETIQUETA / REGISTRO DE SERVICIO',
    'ACCESO AL INMUEBLE',
  ],
  additionalCondition: '',
}
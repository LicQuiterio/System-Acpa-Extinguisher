export const MUNICIPALITIES = [
  'Bacalar',
  'Benito Juárez',
  'Cozumel',
  'Felipe Carrillo Puerto',
  'Isla Mujeres',
  'José María Morelos',
  'Lázaro Cárdenas',
  'Othón P. Blanco',
  'Playa del Carmen',
  'Puerto Morelos',
  'Tulum',
] as const

export type Municipality = (typeof MUNICIPALITIES)[number]
import type { RoutineDay, RoutineExercise } from '../lib/types'

export const GROUPS: Record<string, string> = {
  pecho: 'Pecho',
  espalda: 'Espalda',
  hombros: 'Hombros',
  brazos: 'Brazos',
  piernas: 'Piernas',
  gluteos: 'Glúteos',
  core: 'Core',
  cardio: 'Cardio'
}

export const GCOLORS: Record<string, string> = {
  pecho: '#ff6b6b',
  espalda: '#3fd8c7',
  hombros: '#5db9ff',
  brazos: '#c9f24b',
  piernas: '#ffb02e',
  gluteos: '#ff8bd1',
  core: '#b78bff',
  cardio: '#ff7a2f'
}

export const SET_GUIDE: Record<string, { min: number; max: number }> = {
  pecho: { min: 10, max: 20 },
  espalda: { min: 10, max: 20 },
  hombros: { min: 8, max: 16 },
  brazos: { min: 8, max: 14 },
  piernas: { min: 10, max: 20 },
  gluteos: { min: 8, max: 16 },
  core: { min: 6, max: 12 }
}

export const MEASURES: Array<[string, string]> = [
  ['cuello', 'Cuello'],
  ['hombros', 'Hombros'],
  ['pecho', 'Pecho'],
  ['brazo', 'Brazo'],
  ['antebrazo', 'Antebrazo'],
  ['cintura', 'Cintura'],
  ['cadera', 'Cadera'],
  ['muslo', 'Muslo'],
  ['pantorrilla', 'Pantorrilla']
]

export const DELTA_UNITS: Record<string, string> = {
  peso: 'kg',
  cintura: 'cm',
  cadera: 'cm',
  brazo: 'cm',
  muslo: 'cm'
}

export const PROG_METRIC: Record<'kg' | 'e1rm' | 'vol', { lab: string; unit: string }> = {
  kg: { lab: 'Mejor kg', unit: 'kg' },
  e1rm: { lab: 'e1RM estimado', unit: 'kg' },
  vol: { lab: 'Volumen', unit: 'kg' }
}

/* ---------- RUTINA (sets = semana mínima de cada serie) ---------- */
export const ROUTINE: RoutineDay[] = [
  {
    id: 'lun',
    day: 'Lunes',
    short: 'LUN',
    title: 'Tren Superior 1',
    focus: 'Tracción',
    side: '#ff6b6b',
    ex: [
      {
        n: 'Jalón al pecho en polea alta',
        g: 'espalda',
        reps: '6–10',
        rest: '2 min',
        sets: [1, 1, 1],
        note: 'RIR 2 · dorsal ancho · tracción vertical'
      },
      {
        n: 'Remo con barra o máquina',
        g: 'espalda',
        reps: '6–10',
        rest: '2 min',
        sets: [1, 1, 1],
        note: 'RIR 2 · trapecio medio y romboides · retracción escapular'
      },
      {
        n: 'Pullover en polea alta',
        g: 'espalda',
        reps: '12–15',
        rest: '90 s',
        sets: [1, 1, 1],
        note: 'RIR 1–2 · dorsal ancho en estiramiento · polea alta · tras remo, antes de face pull'
      },
      {
        n: 'Face pull en polea alta',
        g: 'hombros',
        reps: '12–15',
        rest: '60–90 s',
        sets: [1, 1, 1],
        note: 'RIR 2 · rotación externa al final · peso moderado-bajo · salud articular'
      },
      {
        n: 'Peck deck invertido',
        g: 'hombros',
        reps: '10–12',
        rest: '60–90 s',
        sets: [1, 1, 1],
        note: 'RIR 1–2 · deltoides posterior aislado · pausa 1 s en máxima contracción'
      },
      {
        n: 'Elevaciones laterales (mancuernas)',
        g: 'hombros',
        reps: '12–15',
        rest: '60 s',
        sets: [1, 1],
        note: 'RIR 1 · deltoides medial · reclutamiento puro sin trapecio superior'
      },
      {
        n: 'Curl de bíceps con barra EZ',
        g: 'brazos',
        reps: '8–12',
        rest: '90 s',
        sets: [1, 1, 1],
        note: 'RIR 1–2 · bíceps (cabeza corta y larga) + braquial'
      },
      {
        n: 'Curl martillo con mancuernas',
        g: 'brazos',
        reps: '10–15',
        rest: '60–90 s',
        sets: [1, 1, 1],
        note: 'RIR 1–2 · braquial y braquiorradial · agarre neutro'
      },
      {
        n: 'Curl predicador (máquina o barra Z)',
        g: 'brazos',
        reps: '10–12',
        rest: '90 s',
        sets: [1, 1, 1],
        note: 'RIR 1–2 · predicador · cabeza corta aislada · codo fijo'
      }
    ]
  },
  {
    id: 'mar',
    day: 'Martes',
    short: 'MAR',
    title: 'Tren Inferior 1',
    focus: 'Cuádriceps',
    side: '#5db9ff',
    ex: [
      {
        n: 'Sentadilla libre o Hack',
        g: 'piernas',
        reps: '6–10',
        rest: '2.5–3 min',
        sets: [1, 1, 1],
        note: 'RIR 2 · carga axial · máximo reclutamiento sistémico'
      },
      {
        n: 'Sentadilla búlgara con mancuernas',
        g: 'piernas',
        reps: '8–12',
        rest: '2 min',
        sets: [1, 1, 1],
        note: 'RIR 1–2 · torso vertical · énfasis cuádriceps'
      },
      {
        n: 'Extensión de cuádriceps',
        g: 'piernas',
        reps: '12–15',
        rest: '60–90 s',
        sets: [1, 1, 1],
        note: 'RIR 1 · recto femoral en posición estirada'
      },
      {
        n: 'Curl de isquios sentado',
        g: 'piernas',
        reps: '10–15',
        rest: '90 s',
        sets: [1, 1],
        note: 'RIR 1–2 · sentado > tumbado · segundo toque semanal'
      },
      {
        n: 'Elevación de talones de pie',
        g: 'piernas',
        reps: '10–15',
        rest: '60–90 s',
        sets: [1, 1, 1],
        note: 'RIR 1 · pausa 1 s abajo · gastrocnemio'
      },
      {
        n: 'Crunch abdominal en polea',
        g: 'core',
        reps: '12–20',
        rest: '60 s',
        sets: [1, 1, 1],
        note: 'RIR 1–2 · de rodillas · carga progresiva'
      }
    ]
  },
  {
    id: 'mie',
    day: 'Miércoles',
    short: 'MIÉ',
    title: 'Tren Superior 2',
    focus: 'Empuje',
    side: '#ff6b6b',
    ex: [
      {
        n: 'Press de banca con barra',
        g: 'pecho',
        reps: '6–10',
        rest: '2.5–3 min',
        sets: [1, 1, 1],
        note: 'RIR 2 · máxima tensión mecánica'
      },
      {
        n: 'Press inclinado con mancuernas (30°)',
        g: 'pecho',
        reps: '8–12',
        rest: '2 min',
        sets: [1, 1, 1],
        note: 'RIR 1–2 · énfasis cabeza clavicular (pecho superior)'
      },
      {
        n: 'Aperturas (Pec-Deck o poleas)',
        g: 'pecho',
        reps: '12–15',
        rest: '60–90 s',
        sets: [1, 1, 1],
        note: 'RIR 1 · máximo estiramiento · aislamiento puro'
      },
      {
        n: 'Press militar sentado (mancuernas)',
        g: 'hombros',
        reps: '8–12',
        rest: '2 min',
        sets: [1, 1, 1],
        note: 'RIR 2 · sentado elimina impulso lumbar'
      },
      {
        n: 'Elevaciones laterales (mancuernas)',
        g: 'hombros',
        reps: '12–15',
        rest: '60 s',
        sets: [1, 1, 1],
        note: 'RIR 1 · deltoides medial'
      },
      {
        n: 'Extensión tríceps overhead en polea',
        g: 'brazos',
        reps: '10–15',
        rest: '60–90 s',
        sets: [1, 1, 1],
        note: 'RIR 1 · cabeza larga estirada · ~1.4x más hipertrofia que pushdown'
      },
      {
        n: 'Pushdown tríceps en polea',
        g: 'brazos',
        reps: '10–15',
        rest: '60–90 s',
        sets: [1, 1, 1],
        note: 'RIR 1 · énfasis en acortamiento · polea alta'
      }
    ]
  },
  {
    id: 'jue',
    day: 'Jueves',
    short: 'JUE',
    title: 'Tren Inferior 2',
    focus: 'Cadena posterior',
    side: '#5db9ff',
    ex: [
      {
        n: 'Peso muerto rumano',
        g: 'piernas',
        reps: '6–10',
        rest: '2.5–3 min',
        sets: [1, 1, 1],
        note: 'RIR 2 · bisagra de cadera · isquios en posición estirada'
      },
      {
        n: 'Hip thrust con barra',
        g: 'gluteos',
        reps: '8–12',
        rest: '2 min',
        sets: [1, 1, 1],
        note: 'RIR 1–2 · glúteo en acortamiento máximo · complementa al RDL'
      },
      {
        n: 'Curl de isquios sentado',
        g: 'piernas',
        reps: '10–15',
        rest: '90 s',
        sets: [1, 1, 1],
        note: 'RIR 1 · cadera flexionada · segundo toque semanal'
      },
      {
        n: 'Prensa de piernas',
        g: 'piernas',
        reps: '10–12',
        rest: '2 min',
        sets: [1, 1],
        note: 'RIR 1–2 · pies altos y anchos · cadena posterior y aductores'
      },
      {
        n: 'Elevación de talones sentado',
        g: 'piernas',
        reps: '12–15',
        rest: '60–90 s',
        sets: [1, 1, 1],
        note: 'RIR 1 · sóleo · rodilla flexionada'
      },
      {
        n: 'Back extension lastrada',
        g: 'espalda',
        reps: '10–15',
        rest: '90 s',
        sets: [1, 1],
        note: 'RIR 2 · erectores espinales · rango completo'
      }
    ]
  },
  {
    id: 'vie',
    day: 'Viernes',
    short: 'VIE',
    title: 'Tren Superior 3',
    focus: 'Mixto · 2º toque',
    side: '#ff6b6b',
    ex: [
      {
        n: 'Remo en polea baja (Gironda)',
        g: 'espalda',
        reps: '8–12',
        rest: '90 s – 2 min',
        sets: [1, 1, 1],
        note: 'RIR 1–2 · tracción horizontal · segundo toque de espalda'
      },
      {
        n: 'Jalón agarre neutro estrecho',
        g: 'espalda',
        reps: '10–15',
        rest: '90 s',
        sets: [1, 1],
        note: 'RIR 1–2 · fibras ilíacas · segundo toque vertical'
      },
      {
        n: 'Press de pecho en máquina',
        g: 'pecho',
        reps: '8–12',
        rest: '90 s – 2 min',
        sets: [1, 1, 1],
        note: 'RIR 1 · convergente · segundo toque de pecho'
      },
      {
        n: 'Elevaciones laterales en polea',
        g: 'hombros',
        reps: '12–15',
        rest: '60 s',
        sets: [1, 1, 1],
        note: 'RIR 1 · unilateral · tensión constante'
      },
      {
        n: 'Face pull en polea alta',
        g: 'hombros',
        reps: '12–15',
        rest: '60 s',
        sets: [1, 1],
        note: 'RIR 1–2 · deltoides posterior · 5 series semanales'
      },
      {
        n: 'Extensión tríceps en polea (pushdown)',
        g: 'brazos',
        reps: '10–15',
        rest: '60–90 s',
        sets: [1, 1, 1, 1],
        note: 'RIR 1 · énfasis en acortamiento · complementa al overhead'
      },
      {
        n: 'Curl de bíceps inclinado con mancuernas',
        g: 'brazos',
        reps: '10–12',
        rest: '90 s',
        sets: [1, 1, 1, 1],
        note: 'RIR 1–2 · banco 45–60° · brazos atrás del hombro · cabeza larga estirada'
      }
    ]
  }
]
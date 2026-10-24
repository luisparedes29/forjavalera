import { useAppStore } from '../../store/appStore'
import { completedSets, volumeOf } from '../../lib/logic'
import { formatDate } from '../../lib/date'
import AnimatedNumber from '../shared/AnimatedNumber'
import Rutina from './Rutina'
import Sesion from './Sesion'
import Historial from './Historial'

export default function HierroView() {
  const exercises = useAppStore((s) => s.exercises)
  const history = useAppStore((s) => s.history)
  const body = useAppStore((s) => s.body)

  let v = 0
  let sets = 0
  exercises.forEach((e) => {
    v += volumeOf(e.sets)
    sets += completedSets(e.sets).length
  })
  const stVol = Math.round(v)
  const stSets = sets
  const stEx = exercises.length
  const stHist = history.length

  const lastTs = [...history.map((h) => h.ts), ...body.map((b) => b.ts)]
    .sort()
    .pop()

  return (
    <>
      <section className="stats reveal in" id="statsHierro">
        <div className="stat">
          <AnimatedNumber value={stVol} />
          <span>kg volumen hoy</span>
        </div>
        <div className="stat">
          <AnimatedNumber value={stSets} />
          <span>series</span>
        </div>
        <div className="stat">
          <AnimatedNumber value={stEx} />
          <span>ejercicios</span>
        </div>
        <div className="stat">
          <AnimatedNumber value={stHist} />
          <span>sesiones guardadas</span>
        </div>
        <div className="stat">
          <b id="stLast">
            {lastTs ? formatDate(lastTs, { day: 'numeric', month: 'short' }) : '—'}
          </b>
          <span>último registro</span>
        </div>
      </section>

      <div className="routine-wrap">
        <Rutina />
      </div>

      <main>
        <Sesion />
        <Historial />
      </main>
    </>
  )
}
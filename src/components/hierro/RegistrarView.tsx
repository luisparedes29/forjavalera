import type { CSSProperties } from 'react'
import Sesion from './Sesion'
import Historial from './Historial'

export default function RegistrarView() {
  return (
    <main>
      <Sesion />
      <section className="panel reveal d2" style={{ '--acc': 'var(--teal)' } as CSSProperties}>
        <h2>
          <span className="n">02/</span> Historial
        </h2>
        <Historial />
      </section>
    </main>
  )
}

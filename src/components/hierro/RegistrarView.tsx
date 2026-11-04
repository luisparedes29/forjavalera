import Sesion from './Sesion'
import SessionHeader from './SessionHeader'
import VolumePulse from './VolumePulse'

export default function RegistrarView() {
  return (
    <main>
      <SessionHeader />
      <VolumePulse />
      <Sesion />
    </main>
  )
}

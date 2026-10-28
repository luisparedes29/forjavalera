import Stats from './Stats'
import Rutina from './Rutina'

export default function PlanView() {
  return (
    <>
      <Stats />
      <div className="routine-wrap">
        <Rutina />
      </div>
    </>
  )
}

import { useRef } from 'react'
import { useAppStore } from '../../store/appStore'
import { buildBackup, parseBackup, downloadBackup, readFileAsText } from '../../lib/backup'
import { toast } from '../../lib/toast'

export default function FooterBar() {
  const fileRef = useRef<HTMLInputElement | null>(null)

  const exportB = () => {
    const s = useAppStore.getState()
    const data = buildBackup(s.week, s.exercises, s.history, s.body)
    downloadBackup(JSON.stringify(data, null, 2))
    toast('Respaldo descargado (.json)')
  }

  const importClick = () => fileRef.current?.click()

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const d = parseBackup(await readFileAsText(f))
      if (
        !window.confirm(
          'Esto REEMPLAZA tus datos actuales con el respaldo importado. ¿Continuar?'
        )
      )
        return
      useAppStore.getState().restoreAll({
        session: Array.isArray(d.session) ? d.session : [],
        history: Array.isArray(d.history) ? d.history : [],
        body: Array.isArray(d.body) ? d.body : [],
        week: d.week && d.week.week ? d.week : undefined
      })
      toast('Respaldo importado ✔')
    } catch {
      toast('Archivo de respaldo inválido', 'warn')
    }
  }

  const wipe = () => {
    if (
      !window.confirm(
        'Esto borrará TODOS tus datos (sesión, historial, antropometría y semana). ¿Seguro?'
      )
    )
      return
    useAppStore.getState().wipe()
    toast('Todos los datos fueron borrados', 'warn')
  }

  return (
    <>
      <button className="link-btn" id="exportBtn" onClick={exportB}>
        Exportar respaldo
      </button>
      <button className="link-btn" id="importBtn" onClick={importClick}>
        Importar respaldo
      </button>
      <input
        ref={fileRef}
        type="file"
        id="importFile"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          void onImport(e)
        }}
      />
      <button className="link-btn" id="wipe" style={{ color: 'var(--red)' }} onClick={wipe}>
        Borrar todos los datos
      </button>
    </>
  )
}
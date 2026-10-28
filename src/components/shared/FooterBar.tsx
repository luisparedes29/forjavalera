import { useRef, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { buildBackup, parseBackup, downloadBackup, readFileAsText } from '../../lib/backup'
import type { BackupV3 } from '../../lib/backup'
import ConfirmSheet from './ConfirmSheet'
import { toast } from '../../lib/toast'

export default function FooterBar() {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [pendingImport, setPendingImport] = useState<BackupV3 | null>(null)
  const [wipeOpen, setWipeOpen] = useState(false)

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
      setPendingImport(d)
    } catch {
      toast('Archivo de respaldo inválido', 'warn')
    }
  }

  const wipe = () => {
    setWipeOpen(true)
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
      <ConfirmSheet
        open={!!pendingImport}
        title="Importar respaldo"
        confirmLabel="Reemplazar datos"
        onCancel={() => setPendingImport(null)}
        onConfirm={() => {
          if (!pendingImport) return
          useAppStore.getState().restoreAll({
            session: Array.isArray(pendingImport.session) ? pendingImport.session : [],
            history: Array.isArray(pendingImport.history) ? pendingImport.history : [],
            body: Array.isArray(pendingImport.body) ? pendingImport.body : [],
            week:
              pendingImport.week && pendingImport.week.week
                ? pendingImport.week
                : undefined
          })
          setPendingImport(null)
          toast('Respaldo importado ✔')
        }}
      >
        <p>
          Esto <b>reemplaza</b> tu sesión, historial, medidas y semana actuales.
          ¿Continuar?
        </p>
      </ConfirmSheet>

      <ConfirmSheet
        open={wipeOpen}
        title="Borrar todos los datos"
        confirmLabel="Borrar todo"
        danger
        onCancel={() => setWipeOpen(false)}
        onConfirm={() => {
          useAppStore.getState().wipe()
          setWipeOpen(false)
          toast('Todos los datos fueron borrados', 'warn')
        }}
      >
        <p>
          Se borran sesión, historial, antropometría y semana. <b>No se puede deshacer.</b>
        </p>
      </ConfirmSheet>
    </>
  )
}

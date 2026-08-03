import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}

export default function TopBar() {
  const [now, setNow] = useState<Date | null>(null)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = window.setInterval(() => setNow(new Date()), 15000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setDeferred(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = async (): Promise<void> => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
  }

  return (
    <div className="top-right">
      {deferred ? <button className="btn-install" id="installBtn" onClick={install}>⤓ Instalar app</button> : null}
      <div className="chip-date">
        <b id="today">
          {now
            ? now.toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })
            : ''}
        </b>
        <span>
          <span className="clock" id="clock">
            {now ? now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''}
          </span>
          {' · datos locales'}
        </span>
      </div>
    </div>
  )
}
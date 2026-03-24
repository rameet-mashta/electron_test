type UpdaterStatus = { event: string; data?: unknown }

function init(): void {
  window.addEventListener('DOMContentLoaded', () => {
    setup()
  })
}

async function setup(): Promise<void> {
  // App version
  const versions = window.electron.process.versions
  setText('.app-version', `v${versions.app ?? ''}`)

  // Updater: get current state then listen for live pushes
  const initial: UpdaterStatus = await window.electron.ipcRenderer.invoke('updater:status')
  applyUpdaterStatus(initial)
  window.electron.ipcRenderer.on('updater:status', (_e, status: UpdaterStatus) =>
    applyUpdaterStatus(status)
  )

  // DB
  const dbResult = document.getElementById('db-result')

  document.getElementById('db-set')?.addEventListener('click', async () => {
    const key = (document.getElementById('db-key') as HTMLInputElement).value.trim()
    const value = (document.getElementById('db-value') as HTMLInputElement).value.trim()
    if (!key) return
    await window.electron.ipcRenderer.invoke('db:set', key, value)
    if (dbResult) dbResult.textContent = `Saved "${key}" = "${value}"`
  })

  document.getElementById('db-get')?.addEventListener('click', async () => {
    const key = (document.getElementById('db-key') as HTMLInputElement).value.trim()
    if (!key) return
    const row = await window.electron.ipcRenderer.invoke('db:get', key)
    if (dbResult)
      dbResult.textContent = row ? `"${key}" = "${row.value}"` : `No entry for "${key}"`
  })
}

function applyUpdaterStatus(status: UpdaterStatus): void {
  const icon = document.querySelector<HTMLElement>('.update-icon')
  const msg = document.querySelector<HTMLElement>('.update-message')
  const progressEl = document.querySelector<HTMLElement>('.update-progress')
  const fill = document.querySelector<HTMLElement>('.update-fill')
  const pct = document.querySelector<HTMLElement>('.update-percent')

  if (!icon || !msg) return

  const spin = (on: boolean): void => { icon.classList.toggle('spinning', on) }
  const showProgress = (on: boolean): void => {
    if (progressEl) progressEl.hidden = !on
  }

  switch (status.event) {
    case 'checking':
      spin(true)
      showProgress(false)
      icon.textContent = '\u27F3'
      msg.textContent = 'Checking for updates\u2026'
      break
    case 'available':
      spin(false)
      showProgress(false)
      icon.textContent = '\u2B07'
      msg.textContent = `Update available: v${status.data} \u2014 downloading\u2026`
      break
    case 'not-available':
      spin(false)
      showProgress(false)
      icon.textContent = '\u2713'
      msg.textContent = 'You\u2019re up to date'
      break
    case 'progress':
      spin(false)
      showProgress(true)
      icon.textContent = '\u2B07'
      msg.textContent = 'Downloading update\u2026'
      if (fill) fill.style.width = `${status.data}%`
      if (pct) pct.textContent = `${status.data}%`
      break
    case 'downloaded':
      spin(false)
      showProgress(false)
      icon.textContent = '\u2713'
      msg.textContent = `v${status.data} ready \u2014 will install on next restart`
      break
    case 'error':
      spin(false)
      showProgress(false)
      icon.textContent = '\u2715'
      msg.textContent = `Update error: ${status.data}`
      break
    case 'dev':
      spin(false)
      showProgress(false)
      icon.textContent = '\uD83D\uDEE0'
      msg.textContent = 'Dev mode \u2014 auto-update disabled'
      break
    default:
      spin(false)
      showProgress(false)
      icon.textContent = '\u27F3'
      msg.textContent = 'Checking for updates\u2026'
  }
}

function setText(selector: string, text: string): void {
  const el = document.querySelector<HTMLElement>(selector)
  if (el) el.textContent = text
}

init()


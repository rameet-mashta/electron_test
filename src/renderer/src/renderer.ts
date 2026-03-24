function init(): void {
  window.addEventListener('DOMContentLoaded', () => {
    doAThing()
  })
}

async function doAThing(): Promise<void> {
  const versions = window.electron.process.versions
  replaceText('.electron-version', `Electron v${versions.electron}`)
  replaceText('.chrome-version', `Chromium v${versions.chrome}`)
  replaceText('.node-version', `Node v${versions.node}`)
  replaceText('.app-version', `v${versions.app ?? ''}`)

  // Brief flash to show DB connection is live
  const statusDot = document.querySelector<HTMLElement>('.status-dot')
  const statusText = document.querySelector<HTMLElement>('.status-text')
  try {
    await window.electron.ipcRenderer.invoke('db:get', '__ping__')
    if (statusDot) statusDot.classList.add('status-ok')
    if (statusText) statusText.textContent = 'DB connected'
  } catch {
    if (statusDot) statusDot.classList.add('status-err')
    if (statusText) statusText.textContent = 'DB error'
  }

  const ipcHandlerBtn = document.getElementById('ipcHandler')
  ipcHandlerBtn?.addEventListener('click', () => {
    window.electron.ipcRenderer.send('ping')
  })

  const dbSetBtn = document.getElementById('db-set')
  const dbGetBtn = document.getElementById('db-get')
  const dbResult = document.getElementById('db-result')

  dbSetBtn?.addEventListener('click', async () => {
    const key = (document.getElementById('db-key') as HTMLInputElement).value.trim()
    const value = (document.getElementById('db-value') as HTMLInputElement).value.trim()
    if (!key) return
    await window.electron.ipcRenderer.invoke('db:set', key, value)
    if (dbResult) dbResult.textContent = `Saved "${key}" = "${value}"`
  })

  dbGetBtn?.addEventListener('click', async () => {
    const key = (document.getElementById('db-key') as HTMLInputElement).value.trim()
    if (!key) return
    const row = await window.electron.ipcRenderer.invoke('db:get', key)
    if (dbResult) dbResult.textContent = row ? `"${key}" = "${row.value}"` : `No entry found for "${key}"`
  })
}

function replaceText(selector: string, text: string): void {
  const element = document.querySelector<HTMLElement>(selector)
  if (element) {
    element.innerText = text
  }
}

init()

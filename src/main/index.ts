import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import Database from 'better-sqlite3'
import icon from '../../resources/icon.png?asset'

// Initialize SQLite database
const db = new Database(join(app.getPath('userData'), 'app.db'))
db.exec('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)')

// IPC handlers for simple key/value store
ipcMain.handle('db:get', (_e, key: string) => {
  return db.prepare('SELECT value FROM kv WHERE key = ?').get(key)
})
ipcMain.handle('db:set', (_e, key: string, value: string) => {
  db.prepare('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)').run(key, value)
})

// Updater status — kept in memory so renderer can poll on startup
type UpdaterStatus = { event: string; data?: unknown }
let updaterStatus: UpdaterStatus = { event: 'checking' }
let mainWindow: BrowserWindow | null = null

function sendUpdaterStatus(status: UpdaterStatus): void {
  updaterStatus = status
  mainWindow?.webContents.send('updater:status', status)
}

ipcMain.handle('updater:status', () => updaterStatus)

autoUpdater.on('checking-for-update', () =>
  sendUpdaterStatus({ event: 'checking' })
)
autoUpdater.on('update-available', (info) =>
  sendUpdaterStatus({ event: 'available', data: info.version })
)
autoUpdater.on('update-not-available', () =>
  sendUpdaterStatus({ event: 'not-available' })
)
autoUpdater.on('download-progress', (progress) =>
  sendUpdaterStatus({ event: 'progress', data: Math.round(progress.percent) })
)
autoUpdater.on('update-downloaded', (info) =>
  sendUpdaterStatus({ event: 'downloaded', data: info.version })
)
autoUpdater.on('error', (err) =>
  sendUpdaterStatus({ event: 'error', data: err.message })
)

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  if (is.dev) {
    updaterStatus = { event: 'dev' }
  } else {
    autoUpdater.checkForUpdatesAndNotify()
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})


const { app, BrowserWindow, Tray, Menu, shell, clipboard, dialog } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const http = require('http')
const os = require('os')

const PORT = 8090
const URL = `http://127.0.0.1:${PORT}`
let server = null, win = null, tray = null
let quitting = false
let installerOpened = false

// only one copy of the app at a time
if (!app.requestSingleInstanceLock()) app.quit()
app.on('second-instance', () => { win?.show(); win?.focus() })

function serverPath() {
  const name = process.platform === 'win32' ? 'rpg-assistant.exe' : 'rpg-assistant'
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'server')
    : path.join(__dirname, 'server')
  return path.join(base, name)
}

function startServer() {
  // the database lives in the user's app-data folder, not inside the installed app
  const dataDir = path.join(app.getPath('userData'), 'pb_data')
  server = spawn(
    serverPath(),
    ['serve', `--http=0.0.0.0:${PORT}`, `--dir=${dataDir}`],
    { windowsHide: true }
  )

  // first run: PocketBase prints a link to create the superuser; show it in the window
  const onOutput = (chunk) => {
    const m = String(chunk).match(/https?:\/\/\S+pbinstal\S+/)
    if (m && win && !installerOpened) {
      installerOpened = true
      win.loadURL(m[0].replace('0.0.0.0', '127.0.0.1'))
    }
  }
  server.stdout.on('data', onOutput)
  server.stderr.on('data', onOutput)

  server.on('exit', (code) => {
    server = null
    if (!quitting) console.error('Server stopped unexpectedly, exit code', code)
  })
}

function waitForServer(retries = 60) {
  return new Promise((resolve, reject) => {
    const retry = (n) =>
      n <= 0 ? reject(new Error('The server did not start')) : setTimeout(() => attempt(n - 1), 500)
    const attempt = (n) =>
      http
        .get(`${URL}/api/health`, (res) => {
          res.resume()
          res.statusCode === 200 ? resolve() : retry(n)
        })
        .on('error', () => retry(n))
    attempt(retries)
  })
}

function lanUrls() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && (i.family === 'IPv4' || i.family === 4) && !i.internal)
    .map((i) => `http://${i.address}:${PORT}`)
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true },
  })
  win.loadURL(URL)
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
    // GNOME has no tray by default: on Linux, closing the window quits the app
  const hideToTray = process.platform !== 'linux'
  win.on('close', (e) => {
    if (!quitting && hideToTray) { e.preventDefault(); win.hide() }
  })
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'icon.png'))
  tray.setToolTip('RPG Assistant')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show window', click: () => { win.show(); win.focus() } },
      { label: 'Admin panel', click: () => shell.openExternal(`${URL}/_/`) },
      { type: 'separator' },
      { label: 'Players join at (click to copy):', enabled: false },
      ...lanUrls().map((u) => ({ label: u, click: () => clipboard.writeText(u) })),
      { type: 'separator' },
      { label: 'Quit (stops the server)', click: () => { quitting = true; app.quit() } },
    ])
  )
  tray.on('click', () => win.show())
}

app.whenReady().then(async () => {
  startServer()
  try {
    await waitForServer()
  } catch (err) {
    dialog.showErrorBox('RPG Assistant', String(err.message))
    quitting = true
    app.quit()
    return
  }
  createWindow()
  createTray()
})

app.on('before-quit', () => {
  quitting = true
  server?.kill()
})

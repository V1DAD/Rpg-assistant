const { app, BrowserWindow, Tray, Menu, shell, clipboard, dialog } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const http = require('http')
const os = require('os')

const PORT = 8090
const URL = `http://127.0.0.1:${PORT}`
let server = null, win = null, tray = null
let quitting = false
let installerUrl = null      // the "create admin account" link, when PocketBase prints one
let installerShown = false

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

/* ---------- reading the server's output ---------- */
function lineReader(fn) {
  let partial = ''
  return (chunk) => {
    partial += chunk.toString()
    const lines = partial.split(/\r?\n/)
    partial = lines.pop()          // keep the unfinished line for the next chunk
    lines.forEach(fn)
  }
}

function onLine(line) {
  const m = line.match(/https?:\/\/\S*pbinstal\S*/)
  if (m) setInstallerUrl(m[0])
}

function setInstallerUrl(url) {
  installerUrl = url.replace('0.0.0.0', '127.0.0.1')
  refreshMenus()
  if (win && !installerShown) {    // window already open: take the user to the form
    installerShown = true
    go(installerUrl)
  }
}

function startServer() {
  // the database lives in the user's app-data folder, not inside the installed app
  const dataDir = path.join(app.getPath('userData'), 'pb_data')
  server = spawn(
    serverPath(),
    ['serve', `--http=0.0.0.0:${PORT}`, `--dir=${dataDir}`],
    {
      windowsHide: true,
      env: { ...process.env, RPG_NO_BROWSER: '1' },   // never open the system browser
    }
  )
  server.stdout.on('data', lineReader(onLine))
  server.stderr.on('data', lineReader(onLine))
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

/* ---------- window and navigation ---------- */
function go(url) {
  if (!win) return
  win.show()
  win.focus()
  win.loadURL(url)
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: false,        // keep the menu visible: it is how you reach the admin panel
    webPreferences: { contextIsolation: true },
  })

  // first run: go straight to the "create admin account" page if its link is already known
  let first = URL
  if (installerUrl && !installerShown) { first = installerUrl; installerShown = true }
  win.loadURL(first)

  // links to our own server stay inside the window, everything else opens in the browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(URL)) go(url)
    else shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(URL)) {
      e.preventDefault()
      shell.openExternal(url)
    }
  })

  // GNOME has no tray by default: on Linux, closing the window quits the app
  const hideToTray = process.platform !== 'linux'
  win.on('close', (e) => {
    if (!quitting && hideToTray) { e.preventDefault(); win.hide() }
  })
}

/* ---------- menus ---------- */
function appMenu() {
  const nav = () => win?.webContents.navigationHistory ?? win?.webContents
  return Menu.buildFromTemplate([
    {
      label: 'RPG Assistant',
      submenu: [
        { label: "Players' app", accelerator: 'CmdOrCtrl+1', click: () => go(URL) },
        { label: 'Admin panel (PocketBase)', accelerator: 'CmdOrCtrl+2', click: () => go(`${URL}/_/`) },
        ...(installerUrl
          ? [{ label: 'Create admin account (first run)', accelerator: 'CmdOrCtrl+3', click: () => go(installerUrl) }]
          : []),
        { type: 'separator' },
        { label: 'Back', accelerator: 'Alt+Left', click: () => nav()?.canGoBack() && nav().goBack() },
        { type: 'separator' },
        { label: 'Quit (stops the server)', accelerator: 'CmdOrCtrl+Q', click: () => { quitting = true; app.quit() } },
      ],
    },
    { role: 'viewMenu' },
  ])
}

function trayMenu() {
  return Menu.buildFromTemplate([
    { label: 'Show window', click: () => { win?.show(); win?.focus() } },
    { label: "Players' app", click: () => go(URL) },
    { label: 'Admin panel (PocketBase)', click: () => go(`${URL}/_/`) },
    ...(installerUrl
      ? [
          { label: 'Create admin account (first run)', click: () => go(installerUrl) },
          { label: 'Copy admin account link', click: () => clipboard.writeText(installerUrl) },
        ]
      : []),
    { type: 'separator' },
    { label: 'Players join at (click to copy):', enabled: false },
    ...lanUrls().map((u) => ({ label: u, click: () => clipboard.writeText(u) })),
    { type: 'separator' },
    { label: 'Quit (stops the server)', click: () => { quitting = true; app.quit() } },
  ])
}

function refreshMenus() {
  Menu.setApplicationMenu(appMenu())
  tray?.setContextMenu(trayMenu())
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'icon.png'))
  tray.setToolTip('RPG Assistant')
  tray.on('click', () => win?.show())
  refreshMenus()
}

/* ---------- start ---------- */
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

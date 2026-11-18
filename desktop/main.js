const { app, BrowserWindow, Tray, Menu, shell, clipboard, dialog, nativeImage } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const http = require('http')
const os = require('os')

const APP_NAME = 'RPG Assistant'
const PORT = 8090
const URL = `http://127.0.0.1:${PORT}`
const ICON = path.join(__dirname, 'icon.png')

app.setName(APP_NAME)
if (process.platform === 'win32') app.setAppUserModelId('com.example.rpgassistant')

let server = null, win = null, tray = null
let quitting = false
let installerUrl = null       // the "create admin account" link, when PocketBase prints one
let installerShown = false
let tail = ''                 // the last bit of server output, used in error messages

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
  // a dashboard link that carries a token (#... or ?...)
  const m = line.match(/https?:\/\/\S*\/_\/\S*[#?]\S*/)
  if (m) setInstallerUrl(m[0])
}

function setInstallerUrl(url) {
  installerUrl = url.replace('0.0.0.0', '127.0.0.1')
  refreshMenus()
  if (win && !installerShown) {    // window already open: take the user to the form
    installerShown = true
    openInstaller()
  }
}

/* ---------- the server process ---------- */
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

  const keep = (chunk) => {
    tail = (tail + chunk.toString()).slice(-3000)
    process.stdout.write(chunk)                        // also show it in the terminal
  }
  server.stdout.on('data', keep)
  server.stderr.on('data', keep)
  server.stdout.on('data', lineReader(onLine))
  server.stderr.on('data', lineReader(onLine))

  server.on('error', (err) => {                        // e.g. the executable is missing
    tail += '\n' + err.message
    server = null
  })

  server.on('exit', (code) => {
    server = null
    if (!quitting && win) {                            // it was running and then stopped
      dialog.showErrorBox(APP_NAME, `The server stopped (exit code ${code}).\n\n${tail}`)
      quitting = true
      app.quit()
    }
  })
}

function waitForServer(retries = 60) {
  return new Promise((resolve, reject) => {
    const retry = (n) =>
      n <= 0
        ? reject(new Error('The server did not start in time.\n\n' + tail))
        : setTimeout(() => attempt(n - 1), 500)
    const attempt = (n) => {
      if (!server) return reject(new Error('The server stopped during startup.\n\n' + tail))
      http
        .get(`${URL}/api/health`, (res) => {
          res.resume()
          res.statusCode === 200 ? resolve() : retry(n)
        })
        .on('error', () => retry(n))
    }
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

async function openInstaller() {
  if (!win || !installerUrl) return
  // a login left over from an earlier database can send the page to the login screen
  await win.webContents.session.clearStorageData({
    origin: URL,
    storages: ['localstorage', 'cookies'],
  })
  win.show()
  win.focus()
  await win.loadURL('about:blank')   // force a full reload, even if the dashboard is open
  win.loadURL(installerUrl)
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: APP_NAME,
    icon: nativeImage.createFromPath(ICON),
    autoHideMenuBar: false,        // keep the menu visible: it is how you reach the admin panel
    webPreferences: { contextIsolation: true },
  })

  // always show the app name in the title bar, whatever page is loaded
  win.on('page-title-updated', (e) => e.preventDefault())

  // first run: go straight to the "create admin account" page if its link is already known
  if (installerUrl && !installerShown) {
    installerShown = true
    openInstaller()
  } else {
    win.loadURL(URL)
  }

  // links to our own server stay inside the window, everything else opens in the browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(URL)) go(url)
    else shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(URL) && url !== 'about:blank') {
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
      label: APP_NAME,
      submenu: [
        { label: "Players' app", accelerator: 'CmdOrCtrl+1', click: () => go(URL) },
        { label: 'Admin panel (PocketBase)', accelerator: 'CmdOrCtrl+2', click: () => go(`${URL}/_/`) },
        ...(installerUrl
          ? [{ label: 'Create admin account (first run)', accelerator: 'CmdOrCtrl+3', click: () => openInstaller() }]
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
          { label: 'Create admin account (first run)', click: () => openInstaller() },
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
  tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 24, height: 24 }))
  tray.setToolTip(APP_NAME)
  tray.on('click', () => win?.show())
  refreshMenus()
}

/* ---------- start ---------- */
app.whenReady().then(async () => {
  startServer()
  try {
    await waitForServer()
  } catch (err) {
    dialog.showErrorBox(APP_NAME, String(err.message))
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

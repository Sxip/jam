const { app, shell, globalShortcut, BrowserWindow } = require('electron')
const Hosts = require('./util/Hosts')
const Process = require('./process')
const path = require('path')

/**
 * The default window options
 */
const defaultWindowOptions = {
  title: 'Jam',
  backgroundColor: '#16171f',
  resizable: false,
  useContentSize: true,
  width: 840,
  height: 545,
  frame: false,
  protocol: 'file',
  slashes: true,
  webPreferences: {
    webSecurity: false,
    webviewTag: true,
    nativeWindowOpen: true,
    nodeIntegration: true
  },
  icon: path.join('assets', 'icon.png')
}

class Electron {
  constructor () {
    /**
     * The main window
     */
    this.window = null

    /**
     * Hosts
     */
    this.hosts = null

    /**
     * Web server process
     */
    this.process = null
  }

  /**
   * Bootstraps the electron application
   */
  static bootstrap () {
    return new Electron()
  }

  /**
   * Creates the main window
   */
  create () {
    app.on('ready', this.onReady.bind(this))
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit()
      this.hosts.removeAll()
    })
    return this
  }

  /**
   * Registers a global shortcut
   */
  shortcut (key, callback) {
    globalShortcut.register(key, callback)
  }

  /**
   * Opens a item
   */
  openItem (event, path) {
    return shell.openItem(path)
  }

  /**
   * Handles the ready event
   */
  onReady () {
    this.window = new BrowserWindow(defaultWindowOptions)
    this.hosts = new Hosts()

    this.window.loadFile(path.join(__dirname, 'renderer', 'index.html'))
    this.window.webContents.on('new-window', this.createWindow.bind(this))

    this.hosts.load()
    this.shortcut('f11', () => this.window.webContents.openDevTools())

    console.log(path.join(__dirname, 'web', 'index.js'))
    
    this.process = new Process(path.join(__dirname, 'web', 'index.js'))
    this.process.spawn()
  }

  /**
   * Creates a new window
   */
  createWindow (event, url, frameName, _, options) {
    switch (frameName) {
      case 'external':
        event.preventDefault()
        shell.openExternal(url)
        break

      default:
        Object.assign(options, {
          height: 550,
          width: 760,
          file: url,
          frame: true,
          webPreferences: {
            nodeIntegration: true
          },
          autoHideMenuBar: true,
          alwaysOnTop: false,
          resizable: true
        })
    }
  }
}

module.exports = Electron

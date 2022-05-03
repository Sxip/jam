const { app, BrowserWindow, globalShortcut, shell, ipcMain } = require('electron')
const path = require('path')
const { fork } = require('child_process')
const { autoUpdater } = require('electron-updater')

const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * The default window options.
 * @type {Object}
 * @constant
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
    enableRemoteModule: true,
    contextIsolation: false,
    nativeWindowOpen: true,
    nodeIntegration: true,
    preload: path.join(__dirname, 'preload.js')

  },
  icon: path.join('assets', 'icon.png')
}

module.exports = class Electron {
  /**
   * Constructor.
   * @constructor
   */
  constructor () {
    /**
     * The main electron window.
     * @type {?BrowserWindow}
     * @private
     */
    this._window = null

    /**
     * The api backend process.
     * @type {ChildProcess}
     * @private
     */
    this._apiProcess = null

    /**
     * Handles the IPC main events.
     * @events
     */
    ipcMain.on('open-directory', this._openItem.bind(this))
    ipcMain.on('window-close', () => this._window.close())
    ipcMain.on('window-minimize', () => this._window.minimize())
    ipcMain.on('open-directory', path => shell.openPath(path))
    ipcMain.on('open-settings', (_, path) => shell.openExternal(path))
    ipcMain.on('application-relaunch', () => {
      setTimeout(() => {
        app.relaunch()
        app.exit()
      }, 5000)
    })
  }

  /**
   * Creates the main window.
   * @returns {this}
   * @public
   */
  create () {
    app.whenReady().then(() => this._onReady())

    app
      .on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit()
      })
      .on('before-quit', () => this.messageWindow('close'))

    return this
  }

  /**
   * Opens a item.
   * @param {Event} event
   * @param {string} path
   * @returns {Promise<void>}
   * @private
   */
  _openItem (event, path) {
    return shell.openExternal(`file://${path}`)
  }

  /**
   * Registers a global shortcut.
   * @param {string} key
   * @param {Function} callback
   * @returns {void}
   * @private
   */
  _shortcut (key, callback) {
    return globalShortcut.register(key, callback)
  }

  /**
   * Creates a new browser window.
   * @param {Event} event
   * @param {string} url
   * @param {string} frameName
   * @param {any} _
   * @param {Object} options
   * @private
   */
  _createWindow ({ url, frameName }) {
    switch (frameName) {
      case 'external':
        shell.openExternal(url)
        return { action: 'deny' }

      default:
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            autoHideMenuBar: true,
            ...Object.assign(defaultWindowOptions, {
              frame: true,
              webPreferences: {
                nativeWindowOpen: true,
                webSecurity: false,
                protocol: 'file',
                preload: path.join(__dirname, 'preload.js'),
                contextIsolation: false
              }
            })
          }
        }
    }
  }

  buildAutoUpdater () {
    autoUpdater.allowDowngrade = false
    autoUpdater.allowPrerelease = false

    const minutes = 5

    autoUpdater.checkForUpdates()

    setInterval(() => autoUpdater.checkForUpdates(), 1000 * 60 * minutes)

    autoUpdater.on('update-available', () => {
      this.messageWindow('message', {
        type: 'notify',
        message: 'A new update is available.'
      })
    })

    autoUpdater.on('update-downloaded', info => {
      this.messageWindow('message', {
        type: 'celebrate',
        message: 'Update Downloaded. It will be installed on restart.'
      })
    })
  }

  /**
   * Sends a message to the main window process.
   * @param type
   * @param message
   * @public
   */
  messageWindow (type, message = {}) {
    this._window.webContents.send(type, message)
  }

  /**
   * Handles the ready event.
   * @private
   */
  _onReady () {
    this._window = new BrowserWindow(defaultWindowOptions)
    this._window.loadFile(path.join(__dirname, 'renderer', 'index.html'))

    this._window.webContents.setWindowOpenHandler((...args) => this._createWindow(...args))
    this._apiProcess = fork(path.join(__dirname, '..', 'api', 'index.js'))

    // shortcut
    this._shortcut('f11', () => this._window.webContents.openDevTools())
    if (!isDevelopment) this.buildAutoUpdater()

    this._window.on('close', () => this.messageWindow('close'))
  }
}

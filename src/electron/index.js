const { app, BrowserWindow, globalShortcut, shell, ipcMain, protocol, net } = require('electron')
const path = require('path')
const { fork } = require('child_process')
const { autoUpdater } = require('electron-updater')
const { writeFile } = require('fs')

const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Default window options.
 * @type {Object}
 * @constant
 */
const defaultWindowOptions = {
  title: 'Jam',
  backgroundColor: '#16171f',
  resizable: true,
  useContentSize: true,
  width: 840,
  height: 645,
  frame: false,
  webPreferences: {
    webSecurity: false,
    nativeWindowOpen: true,
    contextIsolation: false,
    enableRemoteModule: true,
    nodeIntegration: true,
    preload: path.resolve(__dirname, 'preload.js')
  },
  icon: path.join('assets', 'icon.png')
}

class Electron {
  /**
   * Constructor.
   * @constructor
   */
  constructor () {
    this._window = null
    this._apiProcess = null
    this._httpLoggerSetup = false
    this._setupIPC()
  }

  /**
   * Sets up IPC event handlers.
   * @private
   */
  _setupIPC () {
    ipcMain.on('open-directory', (event, filePath) => shell.openExternal(`file://${filePath}`))
    ipcMain.on('window-close', () => this._window.close())
    ipcMain.on('window-minimize', () => this._window.minimize())
    ipcMain.on('open-settings', (_, url) => shell.openExternal(url))
    ipcMain.on('application-relaunch', () => {
      setTimeout(() => {
        app.relaunch()
        app.exit()
      }, 5000)
    })

    ipcMain.on('open-url', (_, url) => shell.openExternal(url))
    ipcMain.on('override-http-response', (event, { requestId, filePath }) => {
      if (this._apiProcess) {
        this._apiProcess.send({
          type: 'override-response',
          requestId,
          filePath
        })
      }
    })

    ipcMain.on('export-http-logs', (event, logs) => {
      const savePath = path.join(app.getPath('downloads'), `http-logs-${new Date().toISOString().slice(0, 10)}.json`)

      writeFile(savePath, JSON.stringify(logs, null, 2), err => {
        if (err) {
          this.messageWindow('message', {
            type: 'error',
            message: `Failed to export logs: ${err.message}`
          })
        } else {
          this.messageWindow('message', {
            type: 'success',
            message: `Logs exported to ${savePath}`
          })
        }
      })
    })

    ipcMain.on('toggle-http-logging', (event, enabled) => {
      try {
        if (this._apiProcess) {
          this._apiProcess.send({
            type: 'toggle-http-logging',
            enabled
          })
        }
      } catch (error) {
        event.sender.send('message', {
          message: `Failed to toggle HTTP logging: ${error.message}`,
          type: 'error'
        })
      }
    })
  }

  /**
   * Creates the main window and sets up event handlers.
   * @returns {this}
   * @public
   */
  create () {
    app.whenReady().then(() => this._onReady())
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit()
    })

    return this
  }

  /**
   * Registers a global shortcut.
   * @param {string} key - The shortcut key.
   * @param {Function} callback - The callback function.
   * @private
   */
  _registerShortcut (key, callback) {
    globalShortcut.register(key, callback)
  }

  /**
   * Creates a new browser window based on the frame name.
   * @param {Object} options - Options for creating the window.
   * @param {string} options.url - The URL to open.
   * @param {string} options.frameName - The name of the frame.
   * @private
   */
  _createWindow ({ url, frameName }) {
    if (frameName === 'external') {
      shell.openExternal(url)
      return { action: 'deny' }
    }

    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        ...defaultWindowOptions,
        autoHideMenuBar: true,
        frame: true,
        webPreferences: {
          ...defaultWindowOptions.webPreferences
        }
      }
    }
  }

  /**
   * Initializes the auto-updater and sets up update checks.
   * @private
   */
  _initAutoUpdater () {
    autoUpdater.allowDowngrade = false
    autoUpdater.allowPrerelease = false

    const checkInterval = 1000 * 60 * 5 // 5 minutes
    autoUpdater.checkForUpdates()
    setInterval(() => autoUpdater.checkForUpdates(), checkInterval)

    autoUpdater.on('update-available', () => {
      this.messageWindow('message', {
        type: 'notify',
        message: 'A new update is available. Downloading now...'
      })
    })

    autoUpdater.on('update-downloaded', () => {
      this.messageWindow('message', {
        type: 'celebrate',
        message: 'Update Downloaded. It will be installed on restart.'
      })
    })
  }

  /**
   * Sends a message to the main window process.
   * @param {string} type - The message type.
   * @param {Object} [message={}] - The message payload.
   * @public
   */
  messageWindow (type, message = {}) {
    if (this._window && this._window.webContents) {
      this._window.webContents.send(type, message)
    }
  }

  /**
   * Setup HTTP logger connection from API process to renderer
   * @private
   */
  _setupHttpLogger () {
    if (this._httpLoggerSetup || !this._apiProcess) return

    this._apiProcess.on('message', (message) => {
      if (message.type === 'http-logger') this.messageWindow('http-log', message.data)
    })

    this._apiProcess.send({ type: 'start-http-logging' })
    this._httpLoggerSetup = true
  }

  /**
   * Handles the ready event, creates the main window and spawns the API process.
   * @private
   */
  _onReady () {
    this._window = new BrowserWindow(defaultWindowOptions)
    this._window.loadFile(path.join(__dirname, 'renderer', 'index.html'))
    this._window.webContents.setWindowOpenHandler((details) => this._createWindow(details))

    protocol.handle('app', (request) => {
      const url = request.url.slice('app://'.length)
      let filePath

      if (app.isPackaged) {
        filePath = path.join(process.resourcesPath, url)
      } else {
        filePath = path.normalize(`${__dirname}/../../${url}`)
      }

      return net.fetch(`file://${filePath}`)
    })

    this._apiProcess = fork(path.join(__dirname, '..', 'api', 'index.js'))

    this._window.webContents.on('did-finish-load', () => this._setupHttpLogger())
    this._registerShortcut('F11', () => this._window.webContents.openDevTools())

    if (!isDevelopment) {
      this._initAutoUpdater()
    }
  }
}

module.exports = Electron

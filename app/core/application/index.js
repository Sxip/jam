const PluginManager = require('../../core/plugin/PluginManager')
const TCPServer = require('../../network/TCPServer')
const { rootPath } = require('electron-root-path')
const { ipcRenderer } = require('electron')
const { EventEmitter } = require('events')
const Settings = require('../Settings')
const electron = require('electron')
const Console = require('./Console')

class Application extends EventEmitter {
  constructor () {
    super()

    /**
     * The electron instance that can be used to easily access electron
     */
    this.electron = electron.remote

    /**
     * References the tcp server instance
     */
    this.server = new TCPServer()

    /**
     * References the plugin manager instance
     */
    this.pluginManager = new PluginManager()

    /**
     * References the settings instance
     */
    this.settings = new Settings()

    /**
     * References the console instance
     */
    this.console = new Console()
  }

  /**
   * bootstraps the application
   */
  static bootstrap () {
    return new Application()
  }

  /**
   * Closes the window
   */
  close () {
    ipcRenderer.send('window-close')
  }

  /**
   * Minimizes the window
   */
  minimize () {
    ipcRenderer.send('window-minimize')
  }

  /**
   * Opens a directory
   */
  directory (path = rootPath) {
    ipcRenderer.send('open-directory', path)
  }

  /**
   * Initializes the application
   */
  async initialize () {
    this.console.showMessage({
      message: 'Initializing Jam...',
      withStatus: true,
      type: 'wait'
    })

    try {
      await this.settings.load()
      
      await Promise.all([
        this.pluginManager.loadAll(),
        this.server.serve()
      ])

      this.console.showMessage({
        message: 'Successfully initialized Jam!',
        withStatus: true,
        type: 'celebrate'
      })
    } catch (error) {
      this.console.showMessage({
        message: `Failed Initializing ${error.message}`,
        withStatus: true,
        type: 'error'
      })
    }

    this.emit('ready')
  }
}

module.exports = Application

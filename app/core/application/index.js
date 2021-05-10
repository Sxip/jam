const PluginManager = require('../../core/plugin/PluginManager')
const TCPServer = require('../../network/TCPServer')
const { rootPath } = require('electron-root-path')
const { ipcRenderer } = require('electron')
const { EventEmitter } = require('events')
const Settings = require('../Settings')
const electron = require('electron')
const Console = require('./Console')
const fs = require('fs')
const util = require('util')
const os = require('os')
const path = require('path')

const ANIMAL_JAM_BASE_PATH = `${path.join(os.homedir())
  .split("\\")
  .join("/")}/AppData/Local/Programs/animal-jam/resources`

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

    /**
     * Patched check
     */
    this.patched = false
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
   * Patches the application
   */
  async patchApplication() {
    process.noAsar = true;

    try {
      await util.promisify(fs.rename)(`${ANIMAL_JAM_BASE_PATH}/app.asar`, `${ANIMAL_JAM_BASE_PATH}/app.asar.unpatched`)
      await util.promisify(fs.copyFile)(path.join(rootPath, 'assets', 'app.asar'), `${ANIMAL_JAM_BASE_PATH}/app.asar`)
     
      this.patched = true
      $("#patch").html('<i class="fal fa-skull"></i> Unpatch')
      this.settings.update('patched', this.patched)
    } catch (error) {
      this.console.showMessage({
        message: `Failed patching ${error.message}`,
        withStatus: true,
        type: 'error'
      })
    } finally {
      process.noAsar = false;
    }

  }

  async unpatchApplication() {
    process.noAsar = true;

    try {
      await util.promisify(fs.unlink)(`${ANIMAL_JAM_BASE_PATH}/app.asar`)
      await util.promisify(fs.rename)(`${ANIMAL_JAM_BASE_PATH}/app.asar.unpatched`, `${ANIMAL_JAM_BASE_PATH}/app.asar`)

      this.patched = false
      $("#patch").html('<i class="fal fa-skull"></i> Patch')
      this.settings.update('patched', this.patched)
    } catch (error) {
      this.console.showMessage({
        message: `Failed unpatching ${error.message}`,
        withStatus: true,
        type: 'error'
      })
    } finally {
      process.noAsar = false;
    }
  }
  
  /**
   * Patch checker
   */
  async patch() {
    this.patched ? this.unpatchApplication() : this.patchApplication()
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

      this.patched = this.settings.get('patched')
      $("#patch").html(this.patched ? '<i class="fal fa-skull"></i> Unpatch' : '<i class="fal fa-skull"></i> Patch')

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

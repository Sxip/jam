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
const child_process = require('child_process');
const os = require('os')
const path = require('path')
const { response } = require('express')

const ANIMAL_JAM_BASE_PATH = `${path.join(os.homedir())
  .split("\\")
  .join("/")}/AppData/Local/Programs/animal-jam/resources`

class Application extends EventEmitter {
  constructor() {
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
    this.pluginManager = new PluginManager();
    /**
     * References the settings instance
     */
    this.settings = new Settings()

    /**
     * References the console instance
     */
    this.console = new Console()

    /**
    * Checks if AJC executable has been found
    */
    this.containsAJC = false

    /**
     * References the array of replacements
     */
    this.replacements = []

    /**
     * Patched check
     */
    this.patched = false
  }

  /**
   * bootstraps the application
   */
  static bootstrap() {
    return new Application()
  }

  /**
   * Closes the window
   */
  close() {
    ipcRenderer.send('window-close')
  }

  async openDialog(){
    var prom = this.electron.dialog.showOpenDialog(null,{
      properties: ['openFile'],
      filters: [
        { name: 'Executable file', extensions: ['exe'] }
      ],
        title: "Select the AJ Classic Executable" 
    })
    var result = await prom;
    if(result[0] !== undefined){
      return result[0];
    }      
    else{
      return undefined
    }
  }

  /**
 * Adds to replacements in settings
 */
 async addToReplacements(replacementNumber,objectToAdd) {
    try {
      this.settings.settings.replacements[replacementNumber] = objectToAdd
      this.replacements.push(objectToAdd);
      await util.promisify(fs.writeFile)(this.settings.path, JSON.stringify(this.settings.settings, null, 2))
    } catch (error) {
      throw new Error(`Failed to write to settings ${error.message}`)
    }
  }
 /**
 * Removes replacement in settings
 */
 async removeReplacements(replacementNumber) {
    try {
      delete this.settings.settings.replacements[replacementNumber]
      var idx = this.replacements.map(function(obj) { return obj.number; }).indexOf(replacementNumber);
      this.replacements.splice(idx,1)
      await util.promisify(fs.writeFile)(this.settings.path, JSON.stringify(this.settings.settings, null, 2))
    } catch (error) {
      throw new Error(`Failed to write to settings ${error.message}`)
    }
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
   * Check Path of AJC
   */
  checkPath(path) {
    if (path.includes("\\") || path.includes("/")) {
      if (path.includes("\\")) {
        path = path.replace(/\\/g, "/")
      }
      if (path.includes(".exe")) {
        var extentionHack = path.substring(path.lastIndexOf(".") + 1, path.length);
        if(extentionHack == "exe"){
          this.containsAJC = fs.existsSync(path)
         return this.containsAJC
        }
        else{
          return false
        }
      }
      else{
        return false
      }     
    }
    else{
      return false
    }
  }

  /**
 * Start AJC with params
 */
 startAJC(path) {
    this.checkPath(path)
    if (this.containsAJC) {
      var hostText = this.settings.get("remote").hostDomain
      if (hostText.trim().length != 0) {
        hostText = "lb-" + hostText.replace(/\.(stage|prod)\.animaljam\.internal$/, "-$1.animaljam.com")
        var command = `"${path}" --host-resolver-rules="MAP ${hostText} 127.0.0.1:443"`        
        child_process.exec(command);
        this.settings.update("classic_path",path)
        this.settings.update("usingHosts",false)
        return true;
      }
      else {
        return false;
      }
    }
    else {
      return false;
    }
  }

  /**
   * Minimizes the window
   */
  minimize() {
    ipcRenderer.send('window-minimize')
  }

  /**
   * Opens a directory
   */
  directory(path = rootPath) {
    ipcRenderer.send('open-directory', path)
  }

  /**
   * Initializes the application
   */
  async initialize() {
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

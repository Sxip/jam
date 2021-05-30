const path = require('path')
const os = require('os')
const fkill = require('fkill')
const { exec } = require('child_process')
const { rootPath } = require('electron-root-path')
const { unlink, rename, copyFile } = require('fs/promises')

/**
 * Animal Jam Classic base path.
 * @type {String}
 * @constant
 */
const ANIMAL_JAM_BASE_PATH = `${path.join(os.homedir())
  .split('\\')
  .join('/')}/AppData/Local/Programs/animal-jam/resources`

module.exports = class Patcher {
  /**
   * Constructor.
   * @constructor
   */
  constructor (application) {
    /**
     * The application that instantiated this patcher.
     * @type {Settings}
     * @private
     */
    this._application = application

    /**
     * The Animal Jam process.
     * @type {Process}
     * @private
     */
    this._animalJamProcess = null

    /**
     * Patch checker.
     * @type {boolean}
     * @private
     */
    this._patched = false
  }

  /**
   * Kills the Animal Jam Classic process.
   * @param command
   * @returns {Promise<void>}
   * @public
   */
  async killProcessAndPatch (command) {
    await fkill('AJ Classic.exe', {
      force: true,
      silent: true,
      ignoreCase: true
    })

    await this._patchApplication()
    this._animalJamProcess = exec(command)
    this._animalJamProcess.on('close', () => this._unpatchApplication())
  }

  /**
   * Patches Animal Jam Classic.
   * @returns {Promise<void>}
   * @private
   */
  async _patchApplication () {
    process.noAsar = true

    await rename(`${ANIMAL_JAM_BASE_PATH}/app.asar`, `${ANIMAL_JAM_BASE_PATH}/app.asar.unpatched`)
    await copyFile(path.join(rootPath, 'assets', 'app.asar'), `${ANIMAL_JAM_BASE_PATH}/app.asar`)

    this._patched = true
    this._application.settings.update('patched', true)

    process.noAsar = false
  }

  /**
   * Unpatches the application.
   * @returns {Promise<void>}
   * @private
   */
  async _unpatchApplication () {
    process.noAsar = true

    await unlink(`${ANIMAL_JAM_BASE_PATH}/app.asar`)
    await rename(`${ANIMAL_JAM_BASE_PATH}/app.asar.unpatched`, `${ANIMAL_JAM_BASE_PATH}/app.asar`)

    this.patched = false
    this._application.settings.update('patched', false)

    process.noAsar = false
  }
}

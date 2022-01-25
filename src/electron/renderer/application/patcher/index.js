const path = require('path')
const os = require('os')
const fkill = require('fkill')
const { execFile } = require('child_process')
const { rootPath } = require('electron-root-path')
const { unlink, rename, copyFile } = require('fs/promises')

/**
 * Animal Jam Classic base path.
 * @type {String}
 * @constant
 */
const ANIMAL_JAM_BASE_PATH = `${path.join(os.homedir())
  .split('\\')
  .join('/')}/AppData/Local/Programs/aj-classic`

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
  }

  get status () {
    return this._application.settings.get('patched')
  }

  /**
   * Kills the Animal Jam Classic process.
   * @returns {Promise<void>}
   * @public
   */
  async killProcessAndPatch () {
    await fkill('AJ Classic.exe', {
      force: true,
      silent: true,
      ignoreCase: true
    })

    if (!this.status) await this.patchApplication()

    this._animalJamProcess = execFile(`${ANIMAL_JAM_BASE_PATH}/AJ Classic.exe`)
    this._animalJamProcess.on('close', () => this.unpatchApplication())
  }

  /**
   * Patches Animal Jam Classic.
   * @returns {Promise<void>}
   * @public
   */
  async patchApplication () {
    if (this.status) return

    try {
      process.noAsar = true

      await rename(`${ANIMAL_JAM_BASE_PATH}/resources/app.asar`, `${ANIMAL_JAM_BASE_PATH}/resources/app.asar.unpatched`)
      await copyFile(path.join(rootPath, 'assets', 'app.asar'), `${ANIMAL_JAM_BASE_PATH}/resources/app.asar`)

      this._application.settings.update('patched', true)
    } catch {
      this._application.settings.update('patched', false)
    } finally {
      process.noAsar = false
    }
  }

  /**
   * Unpatches the application.
   * @returns {Promise<void>}
   * @public
   */
  async unpatchApplication () {
    if (!this.status) return

    try {
      process.noAsar = true

      await unlink(`${ANIMAL_JAM_BASE_PATH}/resources/app.asar`)
      await rename(`${ANIMAL_JAM_BASE_PATH}/resources/app.asar.unpatched`, `${ANIMAL_JAM_BASE_PATH}/resources/app.asar`)

      this._application.settings.update('patched', false)
    } catch {
      this._application.settings.update('patched', true)
    } finally {
      process.noAsar = false
    }
  }
}

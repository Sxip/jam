const path = require('path')
const os = require('os')
const { rootPath } = require('electron-root-path')
const { rename, copyFile, rm, mkdir } = require('fs/promises')
const { execFile } = require('child_process')

/**
 * Animal Jam Classic base path.
 * @type {String}
 * @constant
 */
const ANIMAL_JAM_CLASSIC_BASE_PATH = `${path.join(os.homedir())
  .split('\\')
  .join('/')}/AppData/Local/Programs/aj-classic`

/**
 * Animal Jam ROAMING path. (for clearing cache automatically)
 * @type {String}
 * @constant
 */
const ANIMAL_JAM_CLASSIC_ROAMING_PATH = `${path.join(os.homedir())
  .split('\\')
  .join('/')}/AppData/Roaming/AJ Classic`

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
    if (!this.status) await this.patchApplication()

    this._animalJamProcess = execFile(`${ANIMAL_JAM_CLASSIC_BASE_PATH}/AJ Classic.exe`)
    this._animalJamProcess.on('exit', () => this._application.settings.update('patched', false))
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

      await rename(`${ANIMAL_JAM_CLASSIC_BASE_PATH}/resources/app.asar`, `${ANIMAL_JAM_CLASSIC_BASE_PATH}/resources/app.asar.unpatched`)
      await copyFile(path.join(rootPath, 'assets', 'app.asar'), `${ANIMAL_JAM_CLASSIC_BASE_PATH}/resources/app.asar`)
      await rm(`${ANIMAL_JAM_CLASSIC_ROAMING_PATH}/Cache`, { recursive: true })
      await mkdir(`${ANIMAL_JAM_CLASSIC_ROAMING_PATH}/Cache`)

      this._application.settings.update('patched', true)
    } catch (e) {
      console.log('Failed patching Animal Jam Classic')
    } finally {
      process.noAsar = false
    }
  }
}

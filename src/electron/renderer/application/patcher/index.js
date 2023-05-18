const path = require('path')
const os = require('os')
const { rootPath } = require('electron-root-path')
const { rename, copyFile, rmdir, mkdir } = require('fs/promises')
const { GameType } = require('../../../../Constants')
const hostile = require('hostile')
const { promisify } = require('util')
const { execFile } = require('child_process')

const execFilePromise = promisify(execFile)

/**
 * Animal Jam Classic base path.
 * @type {String}
 * @constant
 */
const ANIMAL_JAM_CLASSIC_BASE_PATH = `${path.join(os.homedir())
  .split('\\')
  .join('/')}/AppData/Local/Programs/aj-classic`

/**
 * Animal Jam base path.
 * @type {String}
 * @constant
 */
const ANIMAL_JAM_BASE_PATH = `${path.join(os.homedir())
  .split('\\')
  .join('/')}/AppData/Local/Programs/WildWorks/Animal Jam`

/**
 * Animal Jam ROAMING path. (for clearing cache automatically)
 * @type {String}
 * @constant
 */
const ANIMAL_JAM_CLASSIC_ROAMING_PATH = `${path.join(os.homedir())
  .split('\\')
  .join('/')}/AppData/Roaming/AJ Classic`


const BASE_HOST = '127.0.0.1'

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

  get game () {
    return this._application.settings.get('game')
  }

  /**
   * Kills the Animal Jam Classic process.
   * @returns {Promise<void>}
   * @public
   */
  async killProcessAndPatch () {
    switch (this.game) {
      case GameType.animalJamClassic:
        if (!this.status) await this.patchApplication()

        this._animalJamProcess = execFile(`${ANIMAL_JAM_CLASSIC_BASE_PATH}/AJ Classic.exe`)
        this._animalJamProcess.on('exit', () => this.unpatchApplication())
        break

      case GameType.animalJam:
        if (!this.status) this.patchApplication()

        this._animalJamProcess = await execFilePromise(`${ANIMAL_JAM_BASE_PATH}/Data/build/Play Wild.exe`, [], { killSignal: 'SIGKILL' })
        this.unpatchApplication()
        break
    }
  }

  /**
   * Patches Animal Jam Classic.
   * @returns {Promise<void>}
   * @public
   */
  async patchApplication () {
    if (this.status) return

    switch (this.game) {
      case GameType.animalJamClassic:
        try {
          process.noAsar = true

          await rename(`${ANIMAL_JAM_CLASSIC_BASE_PATH}/resources/app.asar`, `${ANIMAL_JAM_CLASSIC_BASE_PATH}/resources/app.asar.unpatched`)
          await copyFile(path.join(rootPath, 'assets', 'app.asar'), `${ANIMAL_JAM_CLASSIC_BASE_PATH}/resources/app.asar`)
          await rmdir(`${ANIMAL_JAM_CLASSIC_ROAMING_PATH}/Cache`)
          await mkdir(`${ANIMAL_JAM_CLASSIC_ROAMING_PATH}/Cache`)
          
          this._application.settings.update('patched', true)
        } finally {
          process.noAsar = false
        }
        break

      case GameType.animalJam:
        // eslint-disable-next-line no-case-declarations, camelcase
        const { aws_1, aws_2 } = this._application.settings.get('defaultAnimalJamServers')

        try {
          await this.setWindowsHostLine(aws_1)
          await this.setWindowsHostLine(aws_2)

          this._application.settings.update('patched', true)
        } catch (e) {
          console.log('Failed patching windows hosts')
        }
        break
    }
  }

  /**
   * Unpatches the application.
   * @returns {Promise<void>}
   * @public
   */
  async unpatchApplication () {
    if (!this.status) return

    // eslint-disable-next-line camelcase
    const { aws_1, aws_2 } = this._application.settings.get('defaultAnimalJamServers')
    if (this.game === GameType.animalJam) {
      try {
        await this.removeWindowsHostLine(aws_1)
        await this.removeWindowsHostLine(aws_2)
      } catch (e) {
        console.log('Failed unpatching Animal Jam servers.. please do it manually.')
      }
    }

    this._application.settings.update('patched', false)
  }

  /**
   * Adds a new line to the windows hosts fille.
   * @returns {Promise<void>}
   * @public
   */
  async setWindowsHostLine (replace) {
    return new Promise((resolve, reject) => {
      hostile.set(BASE_HOST, replace, (e) => {
        if (e) reject(e)
        else resolve()
      })
    })
  }

  async removeWindowsHostLine (replace) {
    return new Promise((resolve, reject) => {
      hostile.remove(BASE_HOST, replace, (e) => {
        if (e) reject(e)
        else resolve()
      })
    })
  }
}

const path = require('path')
const os = require('os')
const { rootPath } = require('electron-root-path')
const { rename, copyFile, rm, mkdir } = require('fs/promises')
const { existsSync } = require('fs')
const { execFile } = require('child_process')
const { promisify } = require('util')

const execFileAsync = promisify(execFile)

/**
 * Animal Jam Classic base path.
 * @constant
 */
const ANIMAL_JAM_CLASSIC_BASE_PATH = path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'aj-classic')

/**
 * Animal Jam cache path.
 * @constant
 */
const ANIMAL_JAM_CLASSIC_CACHE_PATH = path.join(os.homedir(), 'AppData', 'Roaming', 'AJ Classic', 'Cache')

module.exports = class Patcher {
  /**
   * Creates an instance of the Patcher class.
   * @param {Settings} application - The application that instantiated this patcher.
   */
  constructor (application) {
    this._application = application
    this._animalJamProcess = null
  }

  /**
   * Starts Animal Jam Classic process after patching it, if necessary.
   * @returns {Promise<void>}
   */
  async killProcessAndPatch () {
    try {
      await this.patchApplication()

      const exePath = path.join(ANIMAL_JAM_CLASSIC_BASE_PATH, 'AJ Classic.exe')
      this._animalJamProcess = await execFileAsync(exePath)
    } catch (error) {
      console.error(`Failed to start Animal Jam Classic process: ${error.message}`)
    }
  }

  /**
   * Patches Animal Jam Classic application.
   * @returns {Promise<void>}
   */
  async patchApplication () {
    const asarPath = path.join(ANIMAL_JAM_CLASSIC_BASE_PATH, 'resources', 'app.asar')
    const backupAsarPath = `${asarPath}.unpatched`

    try {
      process.noAsar = true

      // Backup and replace app.asar
      if (existsSync(asarPath)) await rename(asarPath, backupAsarPath)
      const sourceAsarPath = path.join(rootPath, 'assets', 'app.asar')
      await copyFile(sourceAsarPath, asarPath)

      // Clear and recreate cache directory
      if (existsSync(ANIMAL_JAM_CLASSIC_CACHE_PATH)) {
        await rm(ANIMAL_JAM_CLASSIC_CACHE_PATH, { recursive: true })
        await mkdir(ANIMAL_JAM_CLASSIC_CACHE_PATH, { recursive: true })
      }
    } catch (error) {
      console.error(`Failed to patch Animal Jam Classic: ${error.message}`)
    } finally {
      process.noAsar = false
    }
  }
}

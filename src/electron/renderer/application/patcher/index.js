const path = require('path')
const os = require('os')
const { copyFile, rm, mkdir, cp } = require('fs/promises')
const { existsSync } = require('fs')
const { execFile } = require('child_process')
const { promisify } = require('util')

const execFileAsync = promisify(execFile)

/**
 * Animal Jam Classic base path
 * @constant
 */
const ANIMAL_JAM_CLASSIC_BASE_PATH = process.platform === 'win32'
  ? path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'aj-classic')
  : process.platform === 'darwin'
    ? path.join('/', 'Applications', 'AJ Classic.app', 'Contents')
    : undefined

/**
 * Custom Jam path
 * @constant
 */
const JAM_CLASSIC_BASE_PATH = process.platform === 'win32'
  ? path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'jam-classic')
  : process.platform === 'darwin'
    ? path.join('/', 'Applications', 'Jam Classic.app', 'Contents')
    : undefined

/**
 * Custom Jam cache path
 * @constant
 */
const JAM_CLASSIC_CACHE_PATH = process.platform === 'win32'
  ? path.join(os.homedir(), 'AppData', 'Roaming', 'Jam Classic', 'Cache')
  : process.platform === 'darwin'
    ? path.join(os.homedir(), 'Library', 'Application Support', 'Jam Classic', 'Cache')
    : undefined

module.exports = class Patcher {
  /**
   * Creates an instance of the Patcher class
   * @param {Settings} application The application that instantiated this patcher
   */
  constructor (application) {
    this._application = application
    this._animalJamProcess = null
  }

  /**
   * Starts Animal Jam Classic process
   * @returns {Promise<void>}
   */
  async killProcessAndPatch () {
    try {
      await this.ensureJamVersionExists()

      if (existsSync(JAM_CLASSIC_CACHE_PATH)) {
        await rm(JAM_CLASSIC_CACHE_PATH, { recursive: true })
        await mkdir(JAM_CLASSIC_CACHE_PATH, { recursive: true })
      }

      const exePath = process.platform === 'win32'
        ? path.join(JAM_CLASSIC_BASE_PATH, 'AJ Classic.exe')
        : process.platform === 'darwin'
          ? path.join(JAM_CLASSIC_BASE_PATH, 'MacOS', 'AJ Classic')
          : undefined

      this._animalJamProcess = await execFileAsync(exePath)
    } catch (error) {
      this._application.consoleMessage({
        message: `Failed to start Jam Classic: ${error.message}`,
        type: 'error'
      })
    }
  }

  /**
   * Ensures that custom Jam version of Animal Jam exists
   * @returns {Promise<void>}
   */
  async ensureJamVersionExists () {
    try {
      if (!existsSync(JAM_CLASSIC_BASE_PATH)) {
        this._application.consoleMessage({
          message: 'Creating custom Jam Classic installation (this only happens once)...',
          type: 'wait'
        })

        if (!existsSync(ANIMAL_JAM_CLASSIC_BASE_PATH)) {
          throw new Error('Animal Jam Classic installation not found. Please install the original game first.')
        }

        const parentDir = path.dirname(JAM_CLASSIC_BASE_PATH)
        if (!existsSync(parentDir)) {
          await mkdir(parentDir, { recursive: true })
        }

        try {
          this._application.consoleMessage({
            message: 'Copying Animal Jam files to custom directory...',
            type: 'wait'
          })

          await mkdir(JAM_CLASSIC_BASE_PATH, { recursive: true })

          if (process.platform === 'win32') {
            const { exec } = require('child_process')
            await new Promise((resolve, reject) => {
              exec(`xcopy "${ANIMAL_JAM_CLASSIC_BASE_PATH}" "${JAM_CLASSIC_BASE_PATH}" /E /I /H /Y`,
                (error) => error ? reject(error) : resolve())
            })
          } else if (process.platform === 'darwin') {
            const { exec } = require('child_process')
            await new Promise((resolve, reject) => {
              exec(`cp -R "${ANIMAL_JAM_CLASSIC_BASE_PATH}/"* "${JAM_CLASSIC_BASE_PATH}/"`,
                (error) => error ? reject(error) : resolve())
            })
          } else {
            await cp(ANIMAL_JAM_CLASSIC_BASE_PATH, JAM_CLASSIC_BASE_PATH, {
              recursive: true,
              force: true,
              preserveTimestamps: true
            })
          }

          this._application.consoleMessage({
            message: 'Files copied successfully.',
            type: 'success'
          })
        } catch (copyError) {
          throw new Error(`Failed to copy files: ${copyError.message}`)
        }

        await this.patchCustomInstallation()

        this._application.consoleMessage({
          message: 'Custom Jam Classic installation created successfully!',
          type: 'success'
        })
      }
    } catch (error) {
      this._application.consoleMessage({
        message: `Failed to create Jam Classic: ${error.message}`,
        type: 'error'
      })
      throw error
    }
  }

  /**
   * Patches custom Jam installation with the modified asar
   * @returns {Promise<void>}
   */
  async patchCustomInstallation () {
    const resourcesDir = path.join(JAM_CLASSIC_BASE_PATH, 'resources')
    const asarPath = path.join(resourcesDir, 'app.asar')
    const asarUnpackedPath = path.join(resourcesDir, 'app.asar.unpacked')

    const customAsarPath = process.platform === 'win32'
      ? path.resolve(__dirname, '..', '..', '..', '..', '..', 'assets', 'winapp.asar')
      : process.platform === 'darwin'
        ? path.resolve(__dirname, '..', '..', '..', '..', '..', 'assets', 'osxapp.asar')
        : undefined

    try {
      process.noAsar = true

      if (!existsSync(resourcesDir)) {
        await mkdir(resourcesDir, { recursive: true })
      }

      if (!existsSync(customAsarPath)) {
        throw new Error(`Custom asar file not found at: ${customAsarPath}`)
      }

      if (existsSync(asarPath)) {
        await rm(asarPath).catch(() => {})
      }
      if (existsSync(asarUnpackedPath)) {
        await rm(asarUnpackedPath, { recursive: true }).catch(() => {})
      }

      await copyFile(customAsarPath, asarPath)

      const exePath = process.platform === 'win32'
        ? path.join(JAM_CLASSIC_BASE_PATH, 'AJ Classic.exe')
        : process.platform === 'darwin'
          ? path.join(JAM_CLASSIC_BASE_PATH, 'MacOS', 'AJ Classic')
          : undefined

      if (!existsSync(exePath)) {
        throw new Error(`Executable not found at: ${exePath}`)
      }

      this._application.consoleMessage({
        message: 'Application successfully patched.',
        type: 'success'
      })
    } catch (error) {
      this._application.consoleMessage({
        message: `Failed to patch Jam Classic: ${error.message}`,
        type: 'error'
      })
      throw error
    } finally {
      process.noAsar = false
    }
  }
}

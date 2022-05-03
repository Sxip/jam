const { rootPath } = require('electron-root-path')
const { readFile, writeFile } = require('fs/promises')
const path = require('path')

/**
 * The path to the settings JSON file.
 * @constructor
 */
const BASE_PATH = path.resolve(rootPath, 'settings.json')

module.exports = class Settings {
  /**
   * Constructor.
   * @constructor
   */
  constructor () {
    /**
     * The settings object.
     * @type {Object}
     * @public
     */
    this.settings = {}
  }

  get path () {
    return BASE_PATH
  }

  /**
   * Loads the settings file.
   * @returns {Promise<void>}
   * @public
   */
  async load () {
    try {
      const settings = await readFile(BASE_PATH, 'utf-8')
      this.settings = JSON.parse(settings)
    } catch (error) {
      throw new Error(`Failed loading the settings file. ${error.message}`)
    }
  }

  /**
   * Returns the value if the given key is found.
   * @param key
   * @param defaultValue
   * @returns {any}
   * @public
   */
  get (key, defaultValue = false) {
    if (this.settings[key]) return this.settings[key]
    return defaultValue
  }

  /**
   * Updates the settings file.
   * @param key
   * @param value
   * @returns {Promise<void>}
   * @public
   */
  async update (key, value) {
    try {
      this.settings[key] = value
      await writeFile(BASE_PATH, JSON.stringify(this.settings, null, 2))
    } catch (error) {
      throw new Error(`Failed updating the settings file. ${error.message}`)
    }
  }
}

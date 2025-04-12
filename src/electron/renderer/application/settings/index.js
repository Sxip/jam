const { readFile, writeFile } = require('fs/promises')
const { watch } = require('fs')
const path = require('path')
const { debounce } = require('lodash')

const BASE_PATH = process.platform === 'win32'
  ? path.resolve('settings.json')
  : process.platform === 'darwin'
    ? path.join(__dirname, '..', '..', '..', '..', '..', '..', '..', 'settings.json')
    : undefined

module.exports = class Settings {
  constructor () {
    this.settings = {}
    this._isLoaded = false

    /**
     * Debounced save operation
     * @type {Function}
     * @private
     */
    this._saveSettingsDebounced = debounce(this._saveSettings, 500, { maxWait: 2000 })

    /**
     * Watches the settings file for external changes
     * @type {Function}
     * @private
     */
    this._watchSettingsFile()
  }

  get path () {
    return BASE_PATH
  }

  /**
   * Loads the settings file
   * @returns {Promise<void>}
   * @public
   */
  async load () {
    try {
      const settings = await readFile(BASE_PATH, 'utf-8')
      this.settings = JSON.parse(settings)
      this._isLoaded = true
    } catch (error) {
      throw new Error(`Failed loading the settings file. ${error.message}`)
    }
  }

  /**
   * Returns the value if the given key is found
   * @param key
   * @param defaultValue
   * @returns {any}
   * @public
   */
  get (key, defaultValue = false) {
    if (!this._isLoaded) {
      throw new Error('Settings have not been loaded yet. Call `load()` first.')
    }
    return this.settings[key] !== undefined ? this.settings[key] : defaultValue
  }

  /**
   * Gets all settings
   * @returns
   */
  getAll () {
    if (!this._isLoaded) {
      throw new Error('Settings have not been loaded yet. Call `load()` first.')
    }
    return this.settings
  }

  /**
   * Saves all settings
   */
  setAll (settings) {
    if (!this._isLoaded) {
      throw new Error('Settings have not been loaded yet. Call `load()` first.')
    }

    this.settings = settings
    this._saveSettingsDebounced()
  }

  /**
   * Updates the settings file
   * @param key
   * @param value
   * @returns {Promise<void>}
   * @public
   */
  async update (key, value) {
    if (!this._isLoaded) throw new Error('Settings have not been loaded yet. Call `load()` first.')

    this.settings[key] = value
    this._saveSettingsDebounced()
  }

  /**
   * Immediately saves the settings to file
   * @private
   */
  async _saveSettings () {
    try {
      await writeFile(BASE_PATH, JSON.stringify(this.settings, null, 2))
    } catch (error) {
      console.error(`Failed saving the settings file. ${error.message}`)
    }
  }

  /**
   * Watches the settings file for external changes and reloads if necessary
   * @private
   */
  _watchSettingsFile () {
    watch(BASE_PATH, async (eventType) => {
      if (eventType === 'change') {
        try {
          const settings = await readFile(BASE_PATH, 'utf-8')
          this.settings = JSON.parse(settings)
        } catch (error) {
          console.error(`Failed reloading the settings file after external change. ${error.message}`)
        }
      }
    })
  }
}

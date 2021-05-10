const { rootPath } = require('electron-root-path')
const path = require('path')
const util = require('util')
const fs = require('fs')

class Settings {
  constructor () {
    /**
     * The path to the settings file
     */
    this.path = path.resolve(rootPath, 'settings.json')

    /**
     * The settings object
     */
    this.settings = {}
  }

  /**
   * Loads the settings
   */
  async load () {
    try {
      const settings = await util.promisify(fs.readFile)(this.path, 'utf-8')
      this.settings = JSON.parse(settings)
    } catch (error) {
      throw new Error(`Failed to load settings ${error.message}`)
    }
  }

  /**
   * Returns the value if the given key is found
   */
  get (key, defaultValue = false) {
    if (this.settings[key]) return this.settings[key]
    return defaultValue
  }

  /**
   * Updates the json value
   */
  async update (key, value = false) {
    if (this.settings[key]) this.settings[key] = value
    await util.promisify(fs.writeFile)(this.path, JSON.stringify(this.settings, null, 2))
  }
}

module.exports = Settings

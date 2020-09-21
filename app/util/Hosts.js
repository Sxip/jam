const Settings = require('../core/Settings')
const hostile = require('hostile')

const LOCAL_HOST = '127.0.0.1'

class Hosts {
  constructor () {
    this.settings = new Settings()
  }

  /**
   * Loads the hosts file
   */
  async load () {
    try {
      await this.settings.load()

      const { primary, secondary } = this.settings.get('hosts')

      await this.set(LOCAL_HOST, primary)
      if (secondary) this.set(LOCAL_HOST, secondary)
    } catch (error) {
      throw new Error(`Failed adding hosts file ${error.message}`)
    }
  }

  /**
   * Removes all of the hosts
   */
  async removeAll () {
    try {
      const { primary, secondary } = this.settings.get('hosts')

      await this.remove(LOCAL_HOST, primary)
      if (secondary) this.remove(LOCAL_HOST, secondary)
    } catch (error) {
      // Do nothing with the error
    }
  }

  /**
   * Add a rule to hosts. If the rule already exists, then this does nothing.
   */
  set (ip, host) {
    return new Promise((resolve, reject) => {
      hostile.set(ip, host, error => {
        if (error) reject(error)
        else resolve()
      })
    })
  }

  /**
   * Remove a rule from hosts. If the rule does not exist, then this does nothing.
   */
  remove (ip, host) {
    return new Promise((resolve, reject) => {
      hostile.remove(ip, host, error => {
        if (error) reject(error)
        else resolve()
      })
    })
  }
}

module.exports = Hosts

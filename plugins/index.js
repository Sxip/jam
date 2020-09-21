class Plugin {
  constructor (application, info) {
    /**
     * Command handlers
     */
    this.commands = info.commands || []

    /**
     * Hook handlers
     */
    this.hooks = info.hooks || []

    /**
     * The server that instantiated this plugin
     */
    this.application = application
  }

  /**
   * Getter for the session
   */
  get session () {
    return this.application.server.session
  }

  /**
   * Called when the plugin has initialized
   */
  initialize () {
    return null
  }

  /**
   * Console messages
   */
  consoleMessage (options = {}) {
    return this.application.console.showMessage(options)
  }

  /**
   * Helper method for random
   */
  random (min, max) {
    return ~~(Math.random() * (max - min + 1)) + min
  }
}

module.exports = Plugin

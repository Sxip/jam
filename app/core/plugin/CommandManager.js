class CommandManager {
  constructor () {
    /**
     * Stores all of the commands
     */
    this.commands = new Map()
  }

  /**
   * Hooks a command
   */
  command ({ name, description, execute } = {}) {
    if (!description) description = 'No description set.'

    if (typeof name !== 'string') {
      return core.console.showMessage({
        message: 'Command name must be a typeof string.',
        withStatus: true,
        type: 'error'
      })
    }

    if (typeof execute !== 'function') {
      return core.console.showMessage({
        message: 'Execute callback must be a typeof function.',
        withStatus: true,
        type: 'error'
      })
    }

    if (typeof description !== 'string') {
      return core.console.showMessage({
        message: 'Description must be a typeof string.',
        withStatus: true,
        type: 'error'
      })
    }

    if (!this.commands.has(name)) this.commands.set(name, { name, description, execute })
  }

  /**
   * Registers all of the commands
   */
  registerCommands (commands) {
    if (!Array.isArray(commands)) throw new Error('Commands must be a typeof array')
    for (const command of commands) this.command(command)
  }

  /**
   * Deletes all of the commands within a plugin
   */
  deleteCommands (Plugin) {
    for (const command of Plugin.commands) {
      const { name } = command
      this.commands.delete(name)
    }
  }
}

module.exports = CommandManager

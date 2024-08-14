module.exports = function ({ application, dispatch }) {
  /**
   * Handles in-game message commands.
   * @param param0
   */
  const handlePublicMessage = ({ message: event, game = true }) => {
    const [message] = event.value('txt').text().split('%')

    if (message.startsWith('!')) {
      event.send = false

      const parameters = message.split(' ').slice(1)
      const command = parameters.shift()

      if (!command) return

      const cmd = dispatch.commands.get(command)
      if (cmd) {
        try {
          cmd.callback({ parameters, game })
        } catch (error) {
          application.consoleMessage({
            type: 'error',
            message: `Failed executing the command ${command}. ${error.message}`
          })
        }
      }
    }
  }

  /**
   * Chat message hook.
   */
  dispatch.onMessage({
    type: 'connection',
    message: 'pubMsg',
    callback: handlePublicMessage
  })
}

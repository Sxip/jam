const Handler = require('../')

class Chat extends Handler {
  handle (packet) {
    const [message] = packet.value('txt').text().split('%')

    if (message.startsWith('!')) {
      packet.send = false

      const parameters = message.split(' ').slice(1)
      const command = parameters.shift()

      if (!command) return

      const cmd = core.pluginManager.instance.commandManager.commands.get(command)
      if (cmd) cmd.execute({ parameters, game: true })
    }
  }
}

module.exports = Chat

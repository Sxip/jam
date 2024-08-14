module.exports = function ({ dispatch }) {
  /**
   * Discord client id.
   */
  const clientId = dispatch.settings.get('discordClientId')

  /**
   * Discord rpc..
   */
  const DiscordRPC = dispatch.require('discord-rpc')
  DiscordRPC.register(clientId)

  /**
   * Discord RPC client.
   */
  const client = new DiscordRPC.Client({
    transport: 'ipc'
  })

  /**
   * Activity settting.
   */
  const setActivity = ({ message }) => {
    const room = message.value[16]

    const { userName } = dispatch.getState('player')

    client.setActivity({
      details: `Currently in room - ${room}`,
      smallImageKey: 'animal_jam_classic',
      smallImageText: `Logged in as ${userName}`,
      instance: false
    })
  }

  /**
   * Room change hook.
   */
  dispatch.onMessage({
    type: 'aj',
    message: 'rj',
    callback: setActivity
  })

  /**
   * Login.
   */
  client.login({ clientId })
}

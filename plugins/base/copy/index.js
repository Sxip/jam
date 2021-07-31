module.exports = function ({ dispatch }) {
  let copy = false

  const MessageTypes = [
    '0',
    '9'
  ]

  /**
   * Handles chat messages.
   */
  const handleChatMessage = ({ message }) => {
    const chat = message.value[5]
    const id = Number(message.value[4])
    const type = message.value[6]

    const { userId } = dispatch.getState('player')
    if (copy && id !== userId && MessageTypes.includes(type)) {
      dispatch.sendRemoteMessage(`<msg t="sys"><body action="pubMsg" r="724201"><txt><![CDATA[${chat}%9]]></txt></body></msg>`)
    }
  }

  /**
   * Chat messaage hook.
   */
  dispatch.onMessage({
    message: 'uc',
    type: 'aj',
    callback: handleChatMessage
  })

  /**
   * Copy message hook.
   */
  dispatch.onCommand({
    name: 'copy',
    description: 'Copies player messages.',
    callback: () => {
      copy = !copy
    }
  })
}

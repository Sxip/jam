module.exports = function ({ dispatch }) {
  let copying = false
  let initialPlayerId = null
  let initialMessageType = null
  let firstPacketCaptured = false

  const handlePacket = ({ message }) => {
    if (copying) {
      const messageContent = message.toMessage ? message.toMessage() : JSON.stringify(message)

      if (!firstPacketCaptured) {
        const initialMatch = messageContent.match(/%xt%uc%\d+%(\d+)%mimic%(9|0)%0%/)
        if (initialMatch) {
          const [fullMatch, playerId, type] = initialMatch

          initialPlayerId = playerId
          initialMessageType = type
          firstPacketCaptured = true
        }
      } else {
        const match = messageContent.match(/%xt%uc%\d+%(\d+)%(.+?)%(9|0)%0%/)

        if (match) {
          const [fullMatch, playerId, msg, type] = match

          if (playerId !== initialPlayerId) {
            const transformedPacket = `<msg t="sys"><body action="pubMsg" r="137235"><txt><![CDATA[${msg}%${initialMessageType}]]></txt></body></msg>`
            dispatch.sendRemoteMessage(transformedPacket)
          }
        } else {
          const specialMatch1 = messageContent.match(/%xt%uc%\d+%(\d+)%(.+?)%1%0%/)
          if (specialMatch1) {
            const [fullMatch, playerId, presetMessage] = specialMatch1

            if (playerId !== initialPlayerId) {
              const transformedPacket = `<msg t="sys"><body action="pubMsg" r="141778"><txt><![CDATA[${presetMessage}%1]]></txt></body></msg>`
              dispatch.sendRemoteMessage(transformedPacket)
            }
          } else {
            const specialMatch2 = messageContent.match(/%xt%uc%\d+%(\d+)%(.+?)%2%0%/)
            if (specialMatch2) {
              const [fullMatch, playerId, emote] = specialMatch2

              if (playerId !== initialPlayerId) {
                const transformedPacket = `<msg t="sys"><body action="pubMsg" r="141778"><txt><![CDATA[${emote}%2]]></txt></body></msg>`
                dispatch.sendRemoteMessage(transformedPacket)
              }
            }
          }
        }
      }
    }
  }

  dispatch.onCommand({
    name: 'mimic',
    description: 'Mimics player messages.',
    callback: () => {
      copying = !copying
      if (copying) {
        initialPlayerId = null
        initialMessageType = null
        firstPacketCaptured = false
        application.consoleMessage({ message: 'Mimic mode enabled.', type: 'speech' })
      } else {
        application.consoleMessage({ message: 'Mimic mode disabled.', type: 'warn' })
      }
    }
  })

  dispatch.onMessage({
    type: '*',
    callback: handlePacket
  })
}

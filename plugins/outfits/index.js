const fs = require('fs')
const path = require('path')

module.exports = function ({ application, dispatch }) {
  let sniffing = false
  let sendingPackets = false
  let packets = []
  let lastPacket = null
  let outfitCaptured = false
  let outfitCount = 0
  const logFilePath = path.join(__dirname, 'data.txt')

  if (!fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, '', 'utf8')
  }

  const loadPacketsFromFile = () => {
    const filePath = path.resolve(__dirname, 'data.txt')
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    packets = fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  }

  const clear = () => {
    sendingPackets = false
  }

  const handleCycleOutfitsCommand = () => {
    if (sendingPackets) {
      clear()
      return
    }

    sendingPackets = true
    loadPacketsFromFile()

    let packetIndex = 0
    const sendNextPacket = () => {
      if (!sendingPackets) return

      if (packetIndex >= packets.length) {
        packetIndex = 0
      }

      const packet = packets[packetIndex++]

      if (packet === '---' || packet.startsWith('Outfit ')) {
        setTimeout(sendNextPacket, 500)
      } else {
        dispatch.sendRemoteMessage(packet)
        setTimeout(sendNextPacket, 200)
      }
    }

    sendNextPacket()
  }

  const handlePacket = ({ message }) => {
    if (sniffing) {
      let messageContent
      try {
        messageContent = message.toMessage ? message.toMessage() : JSON.stringify(message)
      } catch (error) {
        messageContent = JSON.stringify(message)
      }

      if (messageContent.startsWith('%xt%o%iu%') || messageContent.startsWith('%xt%o%ap%')) {
        if (lastPacket) {
          const logMessage = `Outfit ${++outfitCount}:\n${lastPacket}\n${messageContent}\n---\n`
          fs.appendFileSync(logFilePath, logMessage, 'utf8')
          lastPacket = null
          if (!outfitCaptured) {
            application.consoleMessage({
              message: `Captured outfit ${outfitCount}!`,
              type: 'celebrate'
            })
            outfitCaptured = true
          }
        } else {
          lastPacket = messageContent
          setTimeout(() => {
            if (lastPacket) {
              const logMessage = `Outfit ${++outfitCount}:\n${lastPacket}\n---\n`
              fs.appendFileSync(logFilePath, logMessage, 'utf8')
              lastPacket = null
              if (!outfitCaptured) {
                application.consoleMessage({
                  message: `Captured outfit ${outfitCount}!`,
                  type: 'celebrate'
                })
                outfitCaptured = true
              }
            }
          }, 500)
        }
      } else {
        outfitCaptured = false
      }
    }
  }

  for (let i = 1; i <= 20; i++) {
    dispatch.onCommand({
      name: `!${i}`,
      description: `Applies outfit ${i}.`,
      callback: () => {
        loadPacketsFromFile()
        const outfitIndex = packets.findIndex(p => p.startsWith(`Outfit ${i}:`))
        if (outfitIndex >= 0) {
          const outfitPackets = packets.slice(outfitIndex + 1, packets.indexOf('---', outfitIndex))
          outfitPackets.forEach(packet => {
            dispatch.sendRemoteMessage(packet)
          })
        } else {
          application.consoleMessage({
            message: `Outfit ${i} not found.`,
            type: 'error'
          })
        }
      }
    })
  }

  dispatch.onMessage({
    type: '*',
    callback: handlePacket
  })

  dispatch.onCommand({
    name: 'cycleoutfits',
    description: 'Cycles through your outfits.',
    callback: handleCycleOutfitsCommand
  })

  dispatch.onCommand({
    name: 'captureoutfits',
    description: 'Toggles outfit capturing on or off.',
    callback: () => {
      sniffing = !sniffing
      console.log(sniffing ? 'Outfit capture enabled.' : 'Outfit capture disabled.')
      dispatch.serverMessage(sniffing ? 'Outfit capture mode enabled.' : 'Outfit capture mode disabled.')

      if (sniffing) {
        fs.writeFileSync(logFilePath, '', 'utf8')
        outfitCount = 0
      }
    }
  })
}

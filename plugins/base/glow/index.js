module.exports = function ({ dispatch }) {
  /**
   * Color interval.
   */
  let interval = null

  /**
   * Handles glow command.
   */
  const handleGlowCommnd = () => {
    if (interval) return clear()

    interval = dispatch.setInterval(() => glow(), 600)
    dispatch.serverMessage('Only other players will be able to see your glow.')
  }

  /**
   * Sends the glow packet to the server.
   */
  const glow = () => {
    const color = dispatch.random(1019311667, 4348810240)
    dispatch.sendRemoteMessage(`<msg t="sys"><body action="pubMsg" r="2002"><txt><![CDATA[${color}%8]]></txt></body></msg>`)
  }

  /**
   * Clears an interval.
   */
  const clear = () => {
    dispatch.clearInterval(interval)
    interval = null
  }

  /**
   * Chat message hook.
   */
  dispatch.onCommand({
    name: 'glow',
    description: 'Changes your avatar color glow randomly.',
    callback: handleGlowCommnd
  })
}

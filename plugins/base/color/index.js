module.exports = function ({ dispatch }) {
  /**
   * Color interval.
   */
  let interval = null

  /**
   * Handles color command.
   */
  const handleGlowCommnd = () => {
    if (interval) return clear()

    interval = dispatch.setInterval(() => color(), 600)
    dispatch.serverMessage('Only other players will be able to see your colors.')
  }

  /**
   * Sends the color packet to the server.
   */
  const color = () => {
    const randomOne = this.random(1019311667, 4348810240)
    const randomTwo = this.random(1019311667, 4348810240)
    const randomThree = this.random(1019311667, 4348810240)

    dispatch.sendRemoteMessage(`%xt%o%ap%4203%${randomOne}%${randomTwo}%${randomThree}%0%`)
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
    name: 'color',
    description: 'Changes your avatar color randomly.',
    callback: handleGlowCommnd
  })
}

module.exports = function ({ dispatch, application }) {
  /**
   * Color interval.
   */
  let interval = null

  /**
   * Handles adventure command.
   */
  const handleAdventureCommnd = () => {
    const room = dispatch.getState('room')

    if (!room) {
      return application.consoleMessage({
        message: 'You must be in a room to use this plugin.',
        type: 'error'
      })
    }

    if (interval) return clear()
    interval = dispatch.setInterval(() => adventure(room), 600)
  }

  /**
   * Sends the treasure packet to the server.
   */
  const adventure = async (room) => {
    await dispatch.sendRemoteMessage(`%xt%o%qat%${room}%treasure_1%0%`)
    dispatch.sendRemoteMessage(`%xt%o%qatt%${room}%treasure_1%1%`)
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
    name: 'adventure',
    description: 'Loads chests and gives experience.',
    callback: handleAdventureCommnd
  })
}

module.exports = function ({ dispatch }) {
  /**
   * Color interval.
   */
  let interval = null

  /**
   * Handles adventure command.
   */
  const handleAdventureCommnd = () => {
    if (interval) return clear()

    interval = dispatch.setInterval(() => adventure(), 600)
  }

  /**
   * Sends the treasure packet to the server.
   */
  const adventure = async () => {
    await dispatch.sendRemoteMessage('%xt%o%qat%4640562%treasure_1%0%')
    dispatch.sendRemoteMessage('%xt%o%qatt%4640562%treasure_1%1%')
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

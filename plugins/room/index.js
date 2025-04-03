module.exports = function ({ application, dispatch }) {
  /**
   * Handles room join message.
   */
  const handleRoomJoin = ({ message }) => {
    const room = message.value[3]
    dispatch.setState('room', room)
  }

  /**
   * Hooks the room join packet.
   */
  dispatch.onMessage({
    type: 'aj',
    message: 'rj',
    callback: handleRoomJoin
  })
}

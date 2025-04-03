module.exports = function ({ dispatch, application }) {
  let size = 13

  /**
   * Handles the humongous command.
   * @returns
   */
  const handleHumongousCommand = ({ parameters }) => {
    const room = dispatch.getState('room')

    if (!room) {
      return application.consoleMessage({
        message: 'You must be in a room to use this plugin.',
        type: 'error'
      })
    }

    size = parseInt(parameters[0]) || 13
    dispatch.serverMessage('You are now humongous! Re-join the room so other players can see you as a giant.')
  }

  /**
   * Handles movement updates.
   * @param {Object} param The parameter object.
   * @param {Object} param.message The message object.
   * @returns
   */
  const handleMovementUpdate = ({ message }) => {
    const room = dispatch.getState('room')

    const x = message.value[6]
    const y = message.value[7]

    message.send = false
    dispatch.sendRemoteMessage(`%xt%o%au%${room}%1%${x}%${y}%${size}%1%`)
  }

  /**
   * Handles movement updates.
   */
  dispatch.onMessage({
    type: 'connection',
    message: 'au',
    callback: handleMovementUpdate
  })

  /**
   * Handles humongous command.
   */
  dispatch.onCommand({
    name: 'humongous',
    description: 'Look down on all the other animals with this humongous size hack!',
    callback: handleHumongousCommand
  })
}

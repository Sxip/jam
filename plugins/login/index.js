module.exports = function ({ application, dispatch }) {
  /**
   * Handles the login message.
   */
  const handleLoginMessage = ({ message }) => {
    const { params } = message.value.b.o

    dispatch.setState('player', params)

    application.consoleMessage({
      message: 'Successfully logged in!',
      type: 'action'
    })
  }

  /**
   * Hooks the login packet.
   */
  dispatch.onMessage({
    type: 'aj',
    message: 'login',
    callback: handleLoginMessage
  })
}

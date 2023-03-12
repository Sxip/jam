module.exports = function ({ dispatch }) {
  /**
   * Handles the login message.
   */
  const handleLoginMessage = ({ message }) => {
    const { params } = message.value.b.o
    params.accountType = 2
  }

  /**
   * Hoooks the login packet.
   */
  dispatch.onMessage({
    type: 'aj',
    message: 'login',
    callback: handleLoginMessage
  })
}

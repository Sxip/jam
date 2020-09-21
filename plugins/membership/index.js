const Plugin = require('..')

class membership extends Plugin {
  constructor (application) {
    super(application, {
      hooks: [
        {
          type: 'remote',
          packet: 'login',
          execute: ({ packet }) => this.onLoginResponse(packet)
        }
      ]
    })
  }

  /**
   * Handles the login packet
   */
  onLoginResponse (packet) {
    const { params } = packet.value.b.o
    params.accountType = 2
  }
}

module.exports = membership

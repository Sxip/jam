
const Handler = require('../')

class Remote extends Handler {
  handle (packet) {
    const information = packet.value.b.o.params

    core.console.showMessage({
      message: `Successfully logged in as <a href="#">${information.userName}</a>`,
      withStatus: true,
      type: 'success'
    })

    this.manager.session.player = information
  }
}

module.exports = Remote

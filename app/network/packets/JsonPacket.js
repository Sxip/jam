const Packet = require('./')

class JsonPacket extends Packet {
  parse () {
    this.value = JSON.parse(this.value)
    this.type = this.value.b.o._cmd
  }

  toPacket () {
    return JSON.stringify(this.value)
  }
}

module.exports = JsonPacket

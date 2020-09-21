const Packet = require('./')

class XtPacket extends Packet {
  parse () {
    this.value = this.value.split('%')
    this.type = this.value[2] === 'o' ? this.value[3] : this.value[2]
  }

  toPacket () {
    return this.value.join('%')
  }
}

module.exports = XtPacket

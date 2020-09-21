const cheerio = require('cheerio')
const Packet = require('./')

class XmlPacket extends Packet {
  parse () {
    this.value = cheerio.load(this.value, {
      xmlMode: true
    })

    this.type = this.value('body').attr('action')
  }

  toPacket () {
    return this.value.xml()
  }
}

module.exports = XmlPacket

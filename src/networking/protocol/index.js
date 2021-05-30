const { Protocol } = require('netify.js')
const XmlMessage = require('../messages/parsers/XmlMessage')
const JsonMessage = require('../messages/parsers/JsonMessage')
const XtMessage = require('../messages/parsers/XtMessage')

module.exports = class AnimalJamProtocol extends Protocol {
  constructor ({ readBuffer = 1024, writeBuffer = 1024 } = {}) {
    super({
      readBuffer,
      writeBuffer
    })
  }

  /**
   * Handles the incoming packet chunks.
   * @returns {Promise<void>}
   * @public
   */
  async chunk () {
    do {
      let message = this.reader.readCString()
      if (!message) break

      message = message.toString()

      const packet = this._validate(message)

      if (packet) {
        packet.parse()

        this.push({ message, packet })
      }
    } while (this.reader.length)

    if (!this.reader.length) this.reader.reset()
    else if (this.reader.capacity / 2 < this.reader.offset) this.reader.drain()
  }

  /**
   * Validates a packet.
   * @param packet
   * @private
   */
  _validate (packet) {
    if (packet.indexOf('<') !== -1 && packet.lastIndexOf('>') !== -1) return new XmlMessage(packet)
    if (packet.indexOf('%') !== -1 && packet.lastIndexOf('%') !== -1) return new XtMessage(packet)
    if (packet.indexOf('{') !== -1 && packet.lastIndexOf('}') !== -1) return new JsonMessage(packet)
    return null
  }
}

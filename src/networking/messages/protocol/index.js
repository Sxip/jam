const XmlMessage = require('../types/XmlMessage')
const XtMessage = require('../types/XtMessage')
const JsonMessage = require('../types/JsonMessage')

/**
 * The message delimiter.
 * @constant
 */
const NULL_DELIMITER = '\x00'

module.exports = class AnimalJamProtocol {
  constructor (callback) {
    /**
     * The callbaack that is called once a message is received.
     * @type {Function}
     * @private
     */
    this._callback = callback

    /**
     * Message buffer
     * @type {?string}
     * @private
     */
    this._buffer = ''
  }

  /**
   * Validates a packet before turning it into a message.
   * @param packet
   * @returns {Message}
   * @public
   */
  static validate (packet) {
    if (packet.indexOf('<') !== -1 && packet.lastIndexOf('>') !== -1) return new XmlMessage(packet)
    if (packet.indexOf('%') !== -1 && packet.lastIndexOf('%') !== -1) return new XtMessage(packet)
    if (packet.indexOf('{') !== -1 && packet.lastIndexOf('}') !== -1) return new JsonMessage(packet)
    return null
  }

  /**
   * Adds chuck of the packet data to the buffer.
   * @param {string} data
   * @public
   */
  chuck (data) {
    this._buffer += data
    this._next()
  }

  /**
   * Handles parsing the packets into packets,
   * @private
   */
  _next () {
    if (this._buffer[this._buffer.length - 1] === NULL_DELIMITER) {
      const messages = this._buffer.split(NULL_DELIMITER)

      for (let i = 0; i < messages.length - 1; i++) {
        const message = this.constructor.validate(messages[i])
        if (message) {
          message.parse()

          this._callback({
            packet: messages[i],
            message
          })
        }
      }
      this._buffer = ''
    }
  }
}

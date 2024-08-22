const XmlMessage = require('../types/XmlMessage')
const XtMessage = require('../types/XtMessage')
const JsonMessage = require('../types/JsonMessage')

const NULL_DELIMITER = 0x00

module.exports = class AnimalJamProtocol {
  constructor (callback) {
    this._callback = callback
    this._buffer = Buffer.alloc(0)
  }

  /**
   * Validates and returns the appropriate message type.
   * @param {string} packetString
   * @returns {Message|null}
   * @private
   */
  static validate (packetString) {
    if (packetString[0] === '<' && packetString[packetString.length - 1] === '>') return new XmlMessage(packetString)
    if (packetString[0] === '%' && packetString[packetString.length - 1] === '%') return new XtMessage(packetString)
    if (packetString[0] === '{' && packetString[packetString.length - 1] === '}') return new JsonMessage(packetString)
    return null
  }

  /**
   * Adds a chunk of the packet data to the buffer.
   * @param {Buffer} data
   * @public
   */
  chunk (data) {
    this._buffer = Buffer.concat([this._buffer, data], this._buffer.length + data.length)
    this._processBuffer()
  }

  /**
   * Processes the buffer to extract and handle complete messages.
   * @private
   */
  _processBuffer () {
    let startIdx = 0
    let endIdx

    while ((endIdx = this._buffer.indexOf(NULL_DELIMITER, startIdx)) !== -1) {
      const packet = this._buffer.slice(startIdx, endIdx)
      const packetString = packet.toString('utf-8')

      const message = this.constructor.validate(packetString)
      if (message) {
        message.parse()
        this._callback({ packet, message })
      }

      startIdx = endIdx + 1
    }

    if (startIdx < this._buffer.length) {
      this._buffer = this._buffer.slice(startIdx)
    } else {
      this._buffer = Buffer.alloc(0)
    }
  }
}

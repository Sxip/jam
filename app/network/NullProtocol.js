const NULL_DELIMITER = '\x00'

const ProtocolType = {
  local: 0,
  connection: 1
}

class NullProtocol {
  constructor (type, session) {
    /**
     * Protocol type
     */
    this._type = type

    /**
     * References the session instance
     */
    this._session = session

    /**
     * Packet buffer
     * @type {?string}
     * @private
     */
    this._buffer = ''
  }

  /**
   * Adds chuck of the packet data to the buffer
   */
  chuck (data) {
    this._buffer += data
    this._next()
  }

  /**
   * Handles the queue
   */
  _next () {
    if (this._buffer[this._buffer.length - 1] === NULL_DELIMITER) {
      const packets = this._buffer.split(NULL_DELIMITER)

      for (let i = 0; i < packets.length - 1; i++) this._session.onPacket(this._type, packets[i])
      this._buffer = ''
    }
  }
}

module.exports = { NullProtocol, ProtocolType }

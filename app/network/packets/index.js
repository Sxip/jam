class Packet {
  constructor (packet) {
    /**
     * References the packet value
     */
    this.value = packet

    /**
     * Packet type
     */
    this.type = null

    /**
     * Packet send
     */
    this.send = true
  }

  /**
   * Parses the packet
   */
  parse () {
    throw new Error('Method not implemented.')
  }

  /**
   * Converts the packet to string
   */
  toPacket () {
    throw new Error('Method not implemented.')
  }
}

module.exports = Packet

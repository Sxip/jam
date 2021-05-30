module.exports = class Message {
  /**
   * Constructor.
   * @constructor
   */
  constructor (message) {
    /**
     * References the message value.
     * @type {any}
     * @public
     */
    this.value = message

    /**
     * Message type.
     * @type {string}
     * @public
     */
    this.type = null

    /**
     * Message send checker.
     * @type {boolean}
     * @public
     */
    this.send = true
  }

  /**
   * Parses the message.
   * @public
   */
  parse () {
    throw new Error('Method not implemented.')
  }

  /**
   * Converts the message back to a string.
   * @public
   */
  toMessage () {
    throw new Error('Method not implemented.')
  }
}

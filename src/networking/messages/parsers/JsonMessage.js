const Message = require('..')

module.exports = class JsonMessage extends Message {
  /**
   * Parses the JSON message.
   * @public
   */
  parse () {
    this.value = JSON.parse(this.value)
    this.type = this.value.b.o._cmd
  }

  /**
   * Converts the value back to a message string.
   * @returns {string}
   * @public
   */
  toMessage () {
    return JSON.stringify(this.value)
  }
}

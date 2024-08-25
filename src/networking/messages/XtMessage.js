const Message = require('.')

module.exports = class XtMessage extends Message {
  /**
   * Parses the XML message.
   * @public
   */
  parse () {
    const parts = this.value.split('%')
    this.type = parts[2] === 'o' ? parts[3] : parts[2]
    this.value = parts
  }

  /**
   * Converts the value back to a message string.
   * @returns {string}
   * @public
   */
  toMessage () {
    return this.value.join('%')
  }
}

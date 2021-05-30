const Message = require('..')

module.exports = class XtMessage extends Message {
  /**
   * Parses the XML message.
   * @public
   */
  parse () {
    this.value = this.value.split('%')
    this.type = this.value[2] === 'o' ? this.value[3] : this.value[2]
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

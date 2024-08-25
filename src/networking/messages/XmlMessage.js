const { load } = require('cheerio')
const Message = require('.')

module.exports = class XmlMessage extends Message {
  /**
   * Parses the XML message.
   * @public
   */
  parse () {
    this.value = load(this.value, {
      xml: true
    })

    this.type = this.value('body').attr('action')
  }

  /**
   * Converts the value back to a message string.
   * @returns {string}
   * @public
   */
  toMessage () {
    return this.value.xml()
  }
}

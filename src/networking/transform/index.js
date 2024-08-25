const { Transform } = require('stream')

module.exports = class DelimiterTransform extends Transform {
  constructor (delimiter, options) {
    super({ ...options, readableObjectMode: true })
    this.delimiter = Buffer.isBuffer(delimiter) ? delimiter : Buffer.from([delimiter])
    this.buffer = Buffer.alloc(0)
  }

  /**
   * Transforms the data.
   * @param {Buffer} chunk
   * @param {string} encoding
   * @param {Function} callback
   * @private
   */
  _transform (chunk, encoding, callback) {
    this.buffer = Buffer.concat([this.buffer, chunk])

    let delimiterIndex
    while ((delimiterIndex = this.buffer.indexOf(this.delimiter)) !== -1) {
      const data = this.buffer.subarray(0, delimiterIndex)
      this.push(data.toString('utf-8'))
      this.buffer = this.buffer.subarray(delimiterIndex + this.delimiter.length)
    }

    callback()
  }

  /**
   * Flushes the data.
   * @param {Function} callback
   * @private
   */
  _flush (callback) {
    if (this.buffer.length > 0) {
      this.push(this.buffer.toString('utf-8'))
    }
    callback()
  }
}

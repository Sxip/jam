const { Transform } = require('stream')

module.exports = class DelimiterTransform extends Transform {
  constructor (delimiter, options) {
    super({ ...options, readableObjectMode: true }) // Enable object mode for readable stream
    this.delimiter = Buffer.isBuffer(delimiter) ? delimiter : Buffer.from([delimiter]) // Ensure delimiter is a Buffer
    this.buffer = Buffer.alloc(0) // Start with an empty Buffer
  }

  /**
   * Transforms the data.
   * @param {Buffer} chunk
   * @param {string} encoding
   * @param {Function} callback
   * @private
   */
  _transform (chunk, encoding, callback) {
    this.buffer = Buffer.concat([this.buffer, chunk]) // Concatenate the incoming chunk with any existing buffer

    let delimiterIndex
    while ((delimiterIndex = this.buffer.indexOf(this.delimiter)) !== -1) {
      const data = this.buffer.subarray(0, delimiterIndex)
      this.push(data.toString('utf-8'))
      this.buffer = this.buffer.subarray(delimiterIndex + this.delimiter.length) // Efficiently update the buffer using subarray
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
      this.push(this.buffer.toString('utf-8')) // Push the remaining buffer as a string
    }
    callback()
  }
}

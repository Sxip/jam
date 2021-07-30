const requestPromise = require('request-promise-native')
const request = require('request')

module.exports = class HttpClient {
  constructor () {
    throw new Error(`The ${this.constructor.name} class may not be instantiated.`)
  }

  /**
   * Creates a reverse proxy.
   * @param {string} url
   * @returns {Request}
   * @static
   */
  static proxy (url) {
    return request(url)
  }

  /**
   * Makes a GET request.
   * @param {Object} options
   * @returns {Promise<RequestPromise<any>>}
   * @static
   */
  static get (options) {
    return requestPromise.get(options)
  }

  /**
   * Makes a POST request.
   * @param {Object} options
   * @returns {Promise<RequestPromise<any>>}
   */
  static post (options) {
    return requestPromise.post(options)
  }
}

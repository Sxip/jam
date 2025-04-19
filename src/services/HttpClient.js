const requestPromise = require('request-promise-native')
const request = require('request')

module.exports = class HttpClient {
  constructor () {
    throw new Error(`The ${this.constructor.name} class may not be instantiated.`)
  }

  /**
   * Request headers.
   * @getter
   * @returns {Object}
   * @public
   */
  static get baseHeaders () {
    return {
      Host: 'www.animaljam.com',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AJClassic/1.5.4 Chrome/87.0.4280.141 Electron/11.5.0 Safari/537.36'
    }
  }

  /**
   * Creates a reverse proxy.
   * @param {string} url - The URL to proxy.
   * @returns {Request}
   * @static
   */
  static proxy (url) {
    return request(url)
  }

  /**
   * Makes a GET request.
   * @param {Object} options - The options for the request.
   * @returns {Promise<RequestPromise<any>>}
   * @static
   */
  static get (options = {}) {
    if (!options.headers) options.headers = this.baseHeaders
    return requestPromise.get(options)
  }

  /**
   * Makes a POST request.
   * @param {Object} options - The options for the request.
   * @returns {Promise<RequestPromise<any>>}
   */
  static post (options = {}) {
    if (!options.headers) options.headers = this.baseHeaders
    return requestPromise.post(options)
  }

  /**
   * Fetches the animal jam classic flashvars.
   * @returns {Promise<object>}
   */
  static async fetchFlashvars () {
    const data = await this.get({
      url: 'https://www.animaljam.com/flashvars'
    })

    return JSON.parse(data)
  }
}

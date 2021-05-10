const requestPromise = require('request-promise-native')
const request = require('request')

class Http {
  constructor() {
    throw new Error(`The ${this.constructor.name} class may not be instantiated.`)
  }

  /**
   * Reverse proxies Animal Jam
   */
  static proxy(url) {
    return request(url);
  }

  /**
   * Makes a HTTP get request
   */
  static get(options) {
    return requestPromise.get(options)
  }

  /**
   * Makes a HTTP post request
   */
  static post(options) {
    return requestPromise.post(options)
  }
}

module.exports = Http;

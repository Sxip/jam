const HTTPClient = require('../../services/HttpClient')
const path = require('path')

module.exports = new class FilesController {
  /**
   * Host endpoint.
   * @getter
   * @returns {Object}
   * @public
   */
  get baseUrl () {
    return 'https://ajcontent.akamaized.net'
  }

  /**
   * Request headers.
   * @getter
   * @returns {Object}
   * @public
   */
  get baseHeaders () {
    return {
      Host: 'ajcontent.akamaized.net',
      Referer: 'https://desktop.animaljam.com/gameClient/game/index.html'
    }
  }

  /**
   * Renders the animal jam swf file.
   * @param {Request} request
   * @param {Response} response
   * @retuns {void}
   * @public
   */
  game (request, response) {
    return process.platform === 'win32'
      ? response.sendFile(path.resolve('assets', 'flash', 'ajclient.swf'))
      : process.platform === 'darwin'
        ? response.sendFile(path.join(__dirname, '..', '..', '..', '..', '..', 'assets', 'flash', 'ajclient.swf'))
        : undefined
  }

  /**
   * Renders the animal jam files.
   * @param {Request} request
   * @param {Response} response
   * @returns {void}
   * @public
   */
  index (request, response) {
    return request.pipe(
      HTTPClient.proxy({
        url: `${this.baseUrl}/${request.path}`,
        headers: this.baseHeaders
      })
    ).pipe(response)
  }
}()

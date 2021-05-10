const Http = require('../../../http');

class GameController {
  /**
   * Host endpoint
   */
  get baseUrl() {
    return 'https://2.22.22.211'
  }

  /**
   * Request headers
   */
  get baseHeaders() {
    return {
      Host: 'ajcontent.akamaized.net',
      Referer: 'https://desktop.animaljam.com/gameClient/game/index.html'
    }
  }

  /**
   * Renders the animal jam files
   */
  index(request, response) {
    return request.pipe(
      Http.proxy({ 
        url: `${this.baseUrl}/${request.path}`,
        headers: this.baseHeaders
      })
    ).pipe(response)
  }
}

module.exports = new GameController();


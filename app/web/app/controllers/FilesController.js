const Settings = require('../../../core/Settings');
const Http = require('../../../http');
const fs = require('fs');

class GameController {
  /**
   * Host endpoint
   */
  get baseUrl() {
    return 'https://ajcontent.akamaized.net'
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


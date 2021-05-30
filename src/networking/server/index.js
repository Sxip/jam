const { NetifyServer } = require('netify.js')
const Client = require('../client')
const AnimalJamProtocol = require('../protocol')

module.exports = class Server extends NetifyServer {
  /**
   * Constructor.
   * @constructor
   */
  constructor (application) {
    super({
      port: 443
    })

    /**
     * The application that instantiated this server.
     * @type {Application}
     * @public
     */
    this.application = application

    /**
     * The client that has connected to the server.
     * @type {Client}
     * @public
     */
    this.client = null

    /**
     * Handles server events.
     * @type {void}
     * @public
     */
    this.on('connection', connection => this._onConnection(connection))
  }

  /**
   * Handles new incoming connections.
   * @param {NetifySocket} connection
   * @private
   */
  async _onConnection (connection) {
    try {
      this.client = new Client(connection, this)
      await this.client.connect()
    } catch (error) {
      this.application.consoleMessage({
        message: `Unexpected error occurred while trying to connect to the Animal Jam servers. ${error.message}`,
        type: 'error'
      })
    }
  }

  /**
   * Create socket and begin listening for new connections.
   * @returns {Promise<void>}
   * @public
   */
  async serve () {
    this.useProtocol(AnimalJamProtocol)
    return super.serve()
  }
}

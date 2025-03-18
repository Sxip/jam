const Client = require('../client')
const net = require('net')

module.exports = class Server {
  /**
   * Constructor.
   * @constructor
   */
  constructor (application) {
    /**
     * The application that instantiated this server.
     * @type {Application}
     * @public
     */
    this.application = application

    /**
     * The server instance.
     * @type {?net.Server}
     * @public
     */
    this.server = null

    /**
     * The client that has connected to the server.
     * @type {Set<Client>}
     * @public
     */
    this.clients = new Set()
  }

  /**
   * Handles new incoming connections.
   * @param {net.Socket} connection
   * @private
   */
  async _onConnection (connection) {
    try {
      const client = new Client(connection, this)
      await client.connect()

      this.clients.add(client)
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
    if (this.server) throw new Error('The server has already been instantiated.')

    this.server = net.createServer(this._onConnection.bind(this))

    await new Promise((resolve, reject) => {
      this.server.once('listening', resolve)
      this.server.once('error', reject)

      this.server.listen(443, '127.0.0.1')
    })

    this.server.on('error', (error) => {
      this.application.consoleMessage({
        message: `Server encountered an error: ${error.message}`,
        type: 'error'
      })
    })
  }
}

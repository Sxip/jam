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
     * @type {Client}
     * @public
     */
    this.client = null
  }

  /**
   * Handles new incoming connections.
   * @param {NetifySocket} connection
   * @private
   */
  async _onConnection (connection) {
    try {
      this.client = new Client(connection, this)
      this.client.connect()
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
    await new Promise((resolve, reject) => {
      if (this.server) reject(new Error('The server has already been instantiated.'))

      this.server = net.Server()

      const dispose = () => {
        this.server.off('listening', onceListening)
        this.server.off('error', onceError)
        this.server.off('close', onceClose)
      }

      const onceListening = () => {
        resolve()
      }

      const onceClose = error => {
        dispose()
        reject(error)
      }

      const onceError = () => {
        dispose()
      }

      this.server.once('listening', onceListening)
      this.server.once('error', onceError)

      this.server.listen(443, '127.0.0.1')
    })

    this.server.on('connection', this._onConnection.bind(this))
  }
}

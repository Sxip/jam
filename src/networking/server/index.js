const Client = require('../client')
const net = require('net')

module.exports = class Server {
  /**
   * Constructor.
   * @constructor
   */
  constructor (application) {
    /**
     * The application that instantiated this server
     * @type {Application}
     * @public
     */
    this.application = application

    /**
     * The server instance
     * @type {?net.Server}
     * @public
     */
    this.server = null

    /**
     * The client that has connected to the server
     * @type {Set<Client>}
     * @public
     */
    this.clients = new Set()

    /**
     * Ensures default settings for networking are present
     * @type {Function}
     */
    this._ensureDefaultSettings()
  }

  /**
   * Ensure default settings for networking are present
   * @private
   */
  _ensureDefaultSettings () {
    if (!this.application || !this.application.settings) {
      console.warn('Application settings not available, skipping default settings initialization')
      return
    }

    const defaultSettings = {
      autoReconnect: true,
      maxReconnectAttempts: 5,
      connectionTimeout: 10000
    }

    try {
      Object.entries(defaultSettings).forEach(([key, value]) => {
        if (typeof this.application.settings.get === 'function') {
          if (this.application.settings.get(key) === undefined) {
            if (typeof this.application.settings.set === 'function') {
              this.application.settings.set(key, value)
            }
          }
        }
      })
    } catch (error) {
      this.application.consoleMessage({
        message: `Error ensuring default settings: ${error.message}`,
        type: 'error'
      })
    }
  }

  /**
   * Handles new incoming connections
   * @param {net.Socket} connection
   * @private
   */
  async _onConnection (connection) {
    try {
      const client = new Client(connection, this)

      try {
        await client.connect()
        this.clients.add(client)
      } catch (error) {
        if (this.application) {
          this.application.consoleMessage({
            message: `Client connection error: ${error.message}`,
            type: 'error'
          })
        }
      }
    } catch (error) {
      if (this.application) {
        this.application.consoleMessage({
          message: `Unexpected error while handling connection: ${error.message}`,
          type: 'error'
        })
      }
    }
  }

  /**
   * Create socket and begin listening for new connections
   * @returns {Promise<void>}
   * @public
   */
  async serve () {
    if (this.server) throw new Error('The server has already been instantiated.')

    this.server = net.createServer({
      allowHalfOpen: false,
      pauseOnConnect: false
    }, this._onConnection.bind(this))

    this.server.on('error', (error) => {
      this.application.consoleMessage({
        message: `Server encountered an error: ${error.message}`,
        type: 'error'
      })
    })

    await new Promise((resolve, reject) => {
      this.server.once('listening', () => {
        resolve()
      })

      this.server.once('error', (error) => {
        if (error.code === 'EACCES') {
          this.application.consoleMessage({
            message: 'Permission denied when trying to bind to port 443. Try running as administrator.',
            type: 'error'
          })
        } else if (error.code === 'EADDRINUSE') {
          this.application.consoleMessage({
            message: 'Port 443 is already in use. Make sure no other application is using this port.',
            type: 'error'
          })
        }
        reject(error)
      })

      this.server.listen(443, '127.0.0.1')
    })

    this.application.emit('connection:change', false)
  }

  /**
   * Disconnects all clients
   * @param {boolean} manual - Whether this is a manual disconnect
   * @returns {Promise<void>}
   * @public
   */
  async disconnectAllClients (manual = true) {
    const clients = [...this.clients]
    const disconnectPromises = clients.map(client => client.disconnect(manual))

    try {
      await Promise.all(disconnectPromises)

      this.application.consoleMessage({
        message: `Disconnected all clients${manual ? ' (manual disconnect)' : ''}`,
        type: manual ? 'notify' : 'warn'
      })
    } catch (error) {
      this.application.consoleMessage({
        message: `Error disconnecting clients: ${error.message}`,
        type: 'error'
      })
    }
  }
}

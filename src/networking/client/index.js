const AnimalJamProtocol = require('../messages/protocol')
const Message = require('../messages')
const { ConnectionMessageTypes } = require('../../Constants')
const { TLSSocket } = require('tls')

/**
 * Connection messaage blacklist types.
 * @type {Array<string>}
 * @constant
 */
const BLACKLIST_MESSAGES = [
  'apiOK',
  'verChk',
  'rndK',
  'login'
]

module.exports = class Client {
  /**
   * Constructor.
   * @constructor
   */
  constructor (connection, server) {
    /**
     * The server that instantiated this client.
     * @type {Server}
     * @private
     */
    this._server = server

    /**
     * The remote connection to Animal Jam.
     * @type {TLSSocket}
     * @private
     */
    this._aj = new TLSSocket()

    /**
     * The message buffer for Animal Jam messages.
     * @type {AnimalJamProtocol}
     * @private
     */
    this._ajBuffer = new AnimalJamProtocol(({ ...args }) => this._onMessageReceived({
      type: ConnectionMessageTypes.aj,
      ...args
    }))

    /**
     * The message buffer for connection messages.
     * @type {AnimalJamProtocol}
     * @private
     */
    this._connectionBuffer = new AnimalJamProtocol(({ ...args }) => this._onMessageReceived({
      type: ConnectionMessageTypes.connection,
      ...args
    }))

    /**
     * Connected indicator.
     * @type {boolean}
     * @public
     */
    this.connected = false

    /**
     * The connection that instantiated this client.
     * @type {NetifySocket}
     * @private
     */
    this._connection = connection
  }

  /**
   * Begins listening for the server events.
   * @private
   */
  _beginConnectionEvents () {
    this._aj.on('data', data => this._ajBuffer.chuck(data))
      .once('close', () => this.disconnect.bind(this))
  }

  /**
   * Attempts to create a socket connection.
   * @returns {Promise<void>}
   * @public
   */
  async connect () {
    await new Promise((resolve, reject) => {
      if (this._aj.destroyed) reject(new Error('The socket is destroyed.'))

      const onError = err => {
        this._aj.off('error', onError)
        this._aj.off('connect', onConnected)
        reject(err)
      }

      const onConnected = () => {
        this._aj.off('error', onError)
        this._aj.off('connect', onConnected)
        resolve()
      }

      this._aj.once('error', onError)
      this._aj.once('connect', onConnected)

      const smartfoxServer = this._server.application.settings.get('smartfoxServer')
      this._aj.connect({
        host: smartfoxServer,
        port: 443,
        rejectUnauthorized: false
      })
    })

    this.connected = true
    this._beginConnectionEvents()

    this._connection.on('data', data => this._connectionBuffer.chuck(data))
    this._connection.once('close', this.disconnect.bind(this))
  }

  /**
   * Sends a connection message.
   * @param message
   * @returns {Promise<number>}
   * @public
   */
  sendConnectionMessage (message) {
    message = message instanceof Message ? message.toMessage() : message

    try {
      return new Promise((resolve, reject) => {
        if (!this._connection.writable || this._connection.destroyed) reject(new Error('Failed to write to remote after end!'))

        const onceError = err => {
          this._rejected = true
          reject(err)
        }

        const writable = this._connection.write(message) &&
         this._connection.write('\x00')

        if (writable) {
          this._connection.off('error', onceError)
          if (!this._rejected) return resolve(message.length)
        }

        const onceDrain = () => {
          this._connection.off('close', onceClose)
          this._connection.off('error', onceError)
          resolve(message.length)
        }

        const onceClose = () => {
          this._connection.off('drain', onceDrain)
          this._connection.off('error', onceError)
          resolve(message.length)
        }

        this._connection.once('error', onceError)
        this._connection.once('close', onceClose)
        this._connection.once('drain', onceDrain)
      })
    } catch (error) {
      this._server.application.consoleMessage({
        message: `Unexpected error occurred while trying to send a message to the socket connection. ${error.message}`,
        type: 'error'
      })
    }
  }

  /**
   * Sends a remote message.
   * @param message
   * @returns {Promise<number>}
   * @public
   */
  sendRemoteMessage (message) {
    message = message instanceof Message ? message.toMessage() : message

    try {
      return new Promise((resolve, reject) => {
        if (!this._aj.writable || this._aj.destroyed) reject(new Error('Failed to write to remote after end!'))

        const onceError = err => {
          this._rejected = true
          reject(err)
        }

        const writable = this._aj.write(message) &&
        this._aj.write('\x00')

        if (writable) {
          this._aj.off('error', onceError)
          if (!this._rejected) return resolve(message.length)
        }

        const onceDrain = () => {
          this._aj.off('close', onceClose)
          this._aj.off('error', onceError)
          resolve(message.length)
        }

        const onceClose = () => {
          this._aj.off('drain', onceDrain)
          this._aj.off('error', onceError)
          resolve(message.length)
        }

        this._aj.once('error', onceError)
        this._aj.once('close', onceClose)
        this._aj.once('drain', onceDrain)
      })
    } catch (error) {
      this._server.application.consoleMessage({
        message: `Unexpected error occurred while trying to send a message to Animal Jam. ${error.message}`,
        type: 'error'
      })
    }
  }

  /**
   * Handles received message.
   * @param message
   * @private
   */
  _onMessageReceived ({ type, message, packet }) {
    this._server.application.dispatch.all({ type, message })

    switch (type) {
      case ConnectionMessageTypes.aj: {
        if (packet.includes('cross-domain-policy')) {
          const crossDomainMessage = `<?xml version="1.0"?>
          <!DOCTYPE cross-domain-policy SYSTEM "http://www.adobe.com/xml/dtds/cross-domain-policy.dtd">
          <cross-domain-policy>
          <allow-access-from domain="*" to-ports="80,443"/>
          </cross-domain-policy>`

          return this.sendConnectionMessage(crossDomainMessage)
        }
        break
      }

      case ConnectionMessageTypes.connection:
        if (BLACKLIST_MESSAGES.includes(message.type)) {
          return this.sendRemoteMessage(packet)
        }
        break
    }

    if (message.send) {
      if (type === ConnectionMessageTypes.connection) this.sendRemoteMessage(message)
      else this.sendConnectionMessage(message)
    }
  }

  /**
   * Disconnects the session from the remote host and server.
   * @returns {Promise<void>}
   * @public
   */
  async disconnect () {
    this._connection.destroy()
    this._aj.destroy()

    const { dispatch } = this._server.application
    for (const interval of dispatch.intervals) dispatch.clearInterval(interval)
    dispatch.intervals.clear()

    this.connected = false
    this._connection.end()
    this._aj.end()

    this._server.client = null
  }
}

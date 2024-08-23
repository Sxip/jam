const AnimalJamProtocol = require('../messages/protocol')
const Message = require('../messages')
const { ConnectionMessageTypes } = require('../../Constants')
const { TLSSocket } = require('tls')
const { Socket } = require('net')

/**
 * Connection message blacklist types.
 * @type {Array<string>}
 * @constant
 */
const BLACKLIST_MESSAGES = ['apiOK', 'verChk', 'rndK', 'login']

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
     * @type {TLSSocket | Socket}
     * @private
     */
    const secureConnection = this._server.application.settings.get('secureConnection')
    this._aj = secureConnection ? new TLSSocket() : new Socket()

    /**
     * The message buffer for Animal Jam messages.
     * @type {AnimalJamProtocol}
     * @private
     */
    this._ajBuffer = new AnimalJamProtocol(({ ...args }) =>
      this._onMessageReceived({ type: ConnectionMessageTypes.aj, ...args })
    )

    /**
     * The message buffer for connection messages.
     * @type {AnimalJamProtocol}
     * @private
     */
    this._connectionBuffer = new AnimalJamProtocol(({ ...args }) =>
      this._onMessageReceived({ type: ConnectionMessageTypes.connection, ...args })
    )

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

    // Begin listening for connection events
    this._beginConnectionEvents()
  }

  /**
   * Begins listening for the server events.
   * @private
   */
  _beginConnectionEvents () {
    this._aj.on('data', (data) => this._ajBuffer.chunk(data))
      .once('close', this.disconnect.bind(this))
  }

  /**
   * Attempts to create a socket connection.
   * @returns {Promise<void>}
   * @public
   */
  async connect () {
    if (this._aj.destroyed) throw new Error('The socket is destroyed.')

    return new Promise((resolve, reject) => {
      const onError = (err) => {
        this._aj.off('error', onError)
        this._aj.off('connect', onConnected)
        reject(err)
      }

      const onConnected = () => {
        this._aj.off('error', onError)
        this.connected = true
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
    }).then(() => {
      this._connection.on('data', (data) => this._connectionBuffer.chunk(data))
      this._connection.once('close', this.disconnect.bind(this))
    }).catch((error) => {
      this._server.application.consoleMessage({
        message: `Connection error: ${error.message}`,
        type: 'error'
      })
    })
  }

  /**
   * Sends a connection message.
   * @param message
   * @returns {Promise<number>}
   * @public
   */
  sendConnectionMessage (message) {
    return this._sendMessage(this._connection, message)
  }

  /**
   * Sends a remote message.
   * @param message
   * @returns {Promise<number>}
   * @public
   */
  sendRemoteMessage (message) {
    return this._sendMessage(this._aj, message)
  }

  /**
   * Sends a message through the provided socket.
   * @param socket
   * @param message
   * @returns {Promise<number>}
   * @private
   */
  _sendMessage (socket, message) {
    message = message instanceof Message ? message.toMessage() : message

    if (!socket.writable || socket.destroyed) {
      return Promise.reject(new Error('Failed to write to socket after end!'))
    }

    return new Promise((resolve, reject) => {
      const onceError = (err) => reject(err)
      const onceClose = () => resolve(message.length)
      const onceDrain = () => resolve(message.length)

      socket.once('error', onceError)
      socket.once('close', onceClose)
      socket.once('drain', onceDrain)

      const writable = socket.write(message) && socket.write('\x00')
      if (writable) {
        socket.off('error', onceError)
        resolve(message.length)
      }
    }).catch((error) => {
      this._server.application.consoleMessage({
        message: `Message sending error: ${error.message}`,
        type: 'error'
      })
      throw error
    })
  }

  /**
   * Handles received message.
   * @param message
   * @private
   */
  _onMessageReceived ({ type, message, packet }) {
    this._server.application.dispatch.all({ type, message })

    if (type === ConnectionMessageTypes.aj && packet.includes('cross-domain-policy')) {
      const crossDomainMessage = `<?xml version="1.0"?>
        <!DOCTYPE cross-domain-policy SYSTEM "http://www.adobe.com/xml/dtds/cross-domain-policy.dtd">
        <cross-domain-policy>
        <allow-access-from domain="*" to-ports="80,443"/>
        </cross-domain-policy>`

      return this.sendConnectionMessage(crossDomainMessage)
    }

    if (type === ConnectionMessageTypes.connection && BLACKLIST_MESSAGES.includes(message.type)) {
      return this.sendRemoteMessage(packet)
    }

    if (message.send) {
      return type === ConnectionMessageTypes.connection
        ? this.sendRemoteMessage(message)
        : this.sendConnectionMessage(message)
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
    dispatch.intervals.forEach((interval) => dispatch.clearInterval(interval))
    dispatch.intervals.clear()

    this.connected = false
    this._server.client = null
  }
}

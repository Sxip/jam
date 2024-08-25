const { ConnectionMessageTypes } = require('../../Constants')
const { TLSSocket } = require('tls')
const DelimiterTransform = require('../transform')
const { Socket } = require('net')

/**
 * Messages.
 * @constant
 */
const Message = require('../messages')
const XmlMessage = require('../messages/XmlMessage')
const XtMessage = require('../messages/XtMessage')
const JsonMessage = require('../messages/JsonMessage')

/**
 * Connection message blacklist types.
 * @type {Set<string>}
 * @constant
 */
const BLACKLIST_MESSAGES = new Set([
  'apiOK',
  'verChk',
  'rndK',
  'login'
])

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
   * Validates and returns the appropriate message type.
   * @param {string} packetString
   * @returns {Message|null}
   * @private
   */
  static validate (message) {
    if (message[0] === '<' && message[message.length - 1] === '>') return new XmlMessage(message)
    if (message[0] === '%' && message[message.length - 1] === '%') return new XtMessage(message)
    if (message[0] === '{' && message[message.length - 1] === '}') return new JsonMessage(message)
    return null
  }

  /**
 * Attempts to create a socket connection.
 * @returns {Promise<void>}
 * @public
 */
  async connect () {
    if (this._aj.destroyed) throw new Error('The socket is destroyed.')

    try {
      await new Promise((resolve, reject) => {
        const onError = (err) => {
          cleanupListeners()
          reject(err)
        }

        const onConnected = () => {
          cleanupListeners()
          this.connected = true
          resolve()
        }

        const cleanupListeners = () => {
          this._aj.off('error', onError)
          this._aj.off('connect', onConnected)
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

      // Set up the transforms
      this._setupTransforms()
    } catch (error) {
      this._server.application.consoleMessage({
        message: `Connection error: ${error.message}`,
        type: 'error'
      })
    }
  }

  /**
 * Sets up the necessary transforms for socket connections.
 * @private
 */
  _setupTransforms () {
    const ajTransform = new DelimiterTransform(0x00)
    const connectionTransform = new DelimiterTransform(0x00)

    this._aj
      .pipe(ajTransform)
      .on('data', (message) => {
        message = message.toString()

        const validatedMessage = this.constructor.validate(message)
        if (validatedMessage) {
          validatedMessage.parse()

          this._onMessageReceived({
            type: ConnectionMessageTypes.aj,
            message: validatedMessage,
            packet: message
          })
        }
      })
      .once('close', this.disconnect.bind(this))

    this._connection
      .pipe(connectionTransform)
      .on('data', (message) => {
        message = message.toString()

        const validatedMessage = this.constructor.validate(message)
        if (validatedMessage) {
          validatedMessage.parse()

          this._onMessageReceived({
            type: ConnectionMessageTypes.connection,
            message: validatedMessage,
            packet: message
          })
        }
      })
      .once('close', this.disconnect.bind(this))
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
  async _sendMessage (socket, message) {
    if (message instanceof Message) {
      message = message.toMessage()
    }

    if (!socket.writable || socket.destroyed) {
      throw new Error('Failed to write to socket after end!')
    }

    return new Promise((resolve, reject) => {
      const onError = (err) => {
        cleanup()
        reject(err)
      }

      const onDrain = () => {
        cleanup()
        resolve(message.length)
      }

      const onClose = () => {
        cleanup()
        reject(new Error('Socket closed before the message could be sent'))
      }

      const cleanup = () => {
        socket.off('error', onError)
        socket.off('drain', onDrain)
        socket.off('close', onClose)
      }

      socket.once('error', onError)
      socket.once('drain', onDrain)
      socket.once('close', onClose)

      const writable = socket.write(message) && socket.write('\x00')

      if (writable) {
        cleanup()
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
  async _onMessageReceived ({ type, message, packet }) {
    // Dispatch the message
    this._server.application.dispatch.all({ type, message })

    console.log('RECEIVED', message)

    // Handle cross-domain policy response
    if (type === ConnectionMessageTypes.aj && packet.includes('cross-domain-policy')) {
      const crossDomainMessage = `<?xml version="1.0"?>
        <!DOCTYPE cross-domain-policy SYSTEM "http://www.adobe.com/xml/dtds/cross-domain-policy.dtd">
        <cross-domain-policy>
        <allow-access-from domain="*" to-ports="80,443"/>
        </cross-domain-policy>`

      await this.sendConnectionMessage(crossDomainMessage)
      return
    }

    // Handle blacklisted messages
    if (type === ConnectionMessageTypes.connection && BLACKLIST_MESSAGES.has(message.type)) {
      await this.sendRemoteMessage(packet)
      return
    }

    // Handle messages based on the type
    if (message.send) {
      if (type === ConnectionMessageTypes.connection) {
        await this.sendRemoteMessage(message)
      } else {
        await this.sendConnectionMessage(message)
      }
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

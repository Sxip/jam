const { NetifyClient } = require('netify.js')
const AnimalJamProtocol = require('../protocol')
const Message = require('../messages')

/**
 * Connection received types.
 * @type {Object}
 * @const
 */
const connectionReceivedType = Object.freeze({
  connection: 0,
  aj: 1
})

/**
 * Ignore these message types.
 * @type {Array<string>}
 * @constant
 */
const BLACKLIST_MESSAGES = [
  'apiOK',
  'verChk',
  'rndK',
  'login'
]

module.exports = class Client extends NetifyClient {
  /**
   * Constructor.
   * @constructor
   */
  constructor (connection, server) {
    const { host, port } = server.application.settings.get('remote')

    super({
      host,
      port
    })

    /**
     * The server that instantiated this client.
     * @type {Server}
     * @private
     */
    this._server = server

    /**
     * The connection that instantiated this client.
     * @type {NetifySocket}
     * @private
     */
    this._connection = connection

    /**
     * Handles the connection events.
     * @events
     */
    this.on('received', message => this._onMessageReceived({
      ...message,
      type: connectionReceivedType.aj
    }))
  }

  /**
   * Begins listening for the server events.
   * @private
   */
  _beginServerConnectionEvents () {
    this._connection.on('received', message => this._onMessageReceived({
      ...message,
      type: connectionReceivedType.connection
    }))
  }

  /**
   * Attempts to create a socket connection.
   * @returns {Promise<void>}
   * @public
   */
  async connect () {
    this._beginServerConnectionEvents()

    this.useProtocol(AnimalJamProtocol)
    await super.connect()
  }

  /**
   * Sends a connection message.
   * @param message
   * @public
   */
  async sendConnectionMessage (message) {
    message = message instanceof Message ? message.toMessage() : message

    try {
      this._connection.write(message)
      this._connection.write('\x00')
      await this._connection.flush()
    } catch (error) {
      console.log(error)
    }
  }

  /**
   * Sends a remote message.
   * @param message
   * @public
   */
  async sendRemoteMessage (message) {
    message = message instanceof Message ? message.toMessage() : message

    try {
      this.write(message)
      this.write('\x00')
      await this.flush()
    } catch (error) {
      console.log(error)
    }
  }

  /**
   * Handles received message.
   * @param message
   * @private
   */
  _onMessageReceived ({ message, packet, type }) {
    if (BLACKLIST_MESSAGES.includes(packet.type)) {
      packet.send = false
      this.sendRemoteMessage(message)
    }

    if (packet.send) {
      if (type === connectionReceivedType.connection) this.sendRemoteMessage(packet)
      else this.sendConnectionMessage(packet)
    }
  }
}

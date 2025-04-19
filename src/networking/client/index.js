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
 * Connection message blacklist types
 * @type {Set<string>}
 * @constant
 */
const BLACKLIST_MESSAGES = new Set([
  'apiOK',
  'verChk',
  'rndK',
  'login'
])

/**
 * Maximum message queue size before throttling
 * @type {number}
 * @constant
 */
const MAX_QUEUE_SIZE = 1000

module.exports = class Client {
  /**
   * Constructor.
   * @constructor
   */
  constructor (connection, server) {
    /**
     * The server that instantiated this client
     * @type {Server}
     * @private
     */
    this._server = server

    /**
     * The remote connection to Animal Jam
     * @type {TLSSocket | Socket}
     * @private
     */
    const secureConnection = this._server.application.settings.get('secureConnection')
    this._aj = secureConnection ? new TLSSocket() : new Socket()

    /**
     * Connected indicator
     * @type {boolean}
     * @public
     */
    this.connected = false

    /**
     * The connection that instantiated this client
     * @type {NetifySocket}
     * @private
     */
    this._connection = connection

    /**
     * Message queue for handling high message volume
     * @type {Object}
     * @private
     */
    this._messageQueue = {
      aj: [],
      connection: [],
      processing: false
    }

    /**
     * Manual disconnect flag to prevent auto-reconnect
     * @type {boolean}
     * @private
     */
    this._manualDisconnect = false

    /**
     * Reconnection attempt counter
     * @type {number}
     * @private
     */
    this._reconnectAttempts = 0
  }

  /**
   * Validates and returns the appropriate message type
   * @param {string} packetString
   * @returns {Message|null}
   * @private
   */
  static validate (message) {
    try {
      if (!message || typeof message !== 'string') return null

      if (message[0] === '<' && message[message.length - 1] === '>') return new XmlMessage(message)
      if (message[0] === '%' && message[message.length - 1] === '%') return new XtMessage(message)
      if (message[0] === '{' && message[message.length - 1] === '}') return new JsonMessage(message)
      return null
    } catch (error) {
      return null
    }
  }

  /**
   * Attempts to create a socket connection
   * @returns {Promise<void>}
   * @public
   */
  async connect () {
    if (this._aj.destroyed) {
      const secureConnection = this._server &&
        this._server.application &&
        this._server.application.settings &&
        typeof this._server.application.settings.get === 'function'
        ? this._server.application.settings.get('secureConnection')
        : false

      this._aj = secureConnection ? new TLSSocket() : new Socket()
    }

    try {
      await this._attemptConnection()

      this._reconnectAttempts = 0
      this._manualDisconnect = false

      this._setupTransforms()
    } catch (error) {
      if (this._server && this._server.application) {
        this._server.application.consoleMessage({
          message: `Connection error: ${error.message}`,
          type: 'error'
        })
      }

      const shouldAutoReconnect = this._server &&
        this._server.application &&
        this._server.application.settings &&
        typeof this._server.application.settings.get === 'function'
        ? this._server.application.settings.get('autoReconnect') !== false
        : true

      if (shouldAutoReconnect && !this._manualDisconnect) {
        await this._handleReconnection()
      }
    }
  }

  /**
   * Attempts the actual socket connection with timeout
   * @returns {Promise<void>}
   * @private
   */
  async _attemptConnection () {
    return new Promise((resolve, reject) => {
      let connectionTimeout = null

      const onError = (err) => {
        cleanupListeners()
        clearTimeout(connectionTimeout)
        reject(err)
      }

      const onConnected = () => {
        cleanupListeners()
        clearTimeout(connectionTimeout)
        this.connected = true

        this._server.application.emit('connection:change', true)

        resolve()
      }

      const cleanupListeners = () => {
        this._aj.off('error', onError)
        this._aj.off('connect', onConnected)
      }

      connectionTimeout = setTimeout(() => {
        cleanupListeners()
        reject(new Error('Connection timed out after 10 seconds'))
      }, 10000)

      this._aj.once('error', onError)
      this._aj.once('connect', onConnected)

      const smartfoxServer = this._server.application.settings.get('smartfoxServer')
      this._aj.connect({
        host: smartfoxServer,
        port: 443,
        rejectUnauthorized: false
      })
    })
  }

  /**
   * Handle reconnection attempts with exponential backoff
   * @returns {Promise<void>}
   * @private
   */
  async _handleReconnection () {
    const maxReconnectAttempts = this._server.application.settings.get('maxReconnectAttempts') || 5

    if (this._reconnectAttempts >= maxReconnectAttempts) {
      this._server.application.consoleMessage({
        message: `Failed to reconnect after ${maxReconnectAttempts} attempts.`,
        type: 'error'
      })
      return
    }

    this._reconnectAttempts++

    const baseDelay = 1000
    const maxDelay = 30000
    const jitter = Math.random() * 0.3

    const delay = Math.min(
      Math.pow(2, this._reconnectAttempts) * baseDelay * (1 + jitter),
      maxDelay
    )

    this._server.application.consoleMessage({
      message: `Connection lost, attempting to reconnect in ${Math.round(delay / 1000)}s (${this._reconnectAttempts}/${maxReconnectAttempts})`,
      type: 'warn'
    })

    await new Promise(resolve => setTimeout(resolve, delay))
    return this.connect()
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

        try {
          const validatedMessage = this.constructor.validate(message)
          if (validatedMessage) {
            this._queueMessage({
              type: ConnectionMessageTypes.aj,
              message: validatedMessage,
              packet: message
            })
          }
        } catch (error) {
          this._server.application.consoleMessage({
            message: `Error processing AJ message: ${error.message}`,
            type: 'error'
          })
        }
      })
      .once('close', () => {
        if (!this._manualDisconnect) {
          this._server.application.emit('connection:change', false)
        }
        this.disconnect()
      })

    this._connection
      .pipe(connectionTransform)
      .on('data', (message) => {
        message = message.toString()

        try {
          const validatedMessage = this.constructor.validate(message)
          if (validatedMessage) {
            this._queueMessage({
              type: ConnectionMessageTypes.connection,
              message: validatedMessage,
              packet: message
            })
          }
        } catch (error) {
          this._server.application.consoleMessage({
            message: `Error processing connection message: ${error.message}`,
            type: 'error'
          })
        }
      })
      .once('close', this.disconnect.bind(this))

    this._processMessageQueue()
  }

  /**
   * Queues a message for processing
   * @param {Object} messageData - Message data to be processed
   * @private
   */
  _queueMessage (messageData) {
    const queueType = messageData.type === ConnectionMessageTypes.aj ? 'aj' : 'connection'
    const queue = this._messageQueue[queueType]

    if (queue.length > MAX_QUEUE_SIZE) {
      this._server.application.consoleMessage({
        message: `Message queue size exceeds ${MAX_QUEUE_SIZE} items, possible performance issue`,
        type: 'warn'
      })
    }

    queue.push(messageData)

    if (!this._messageQueue.processing) {
      this._processMessageQueue()
    }
  }

  /**
   * Process messages from the queue
   * @private
   */
  async _processMessageQueue () {
    if (this._messageQueue.processing) return

    this._messageQueue.processing = true

    try {
      while (this._messageQueue.connection.length > 0) {
        const messageData = this._messageQueue.connection.shift()
        await this._processMessage(messageData)
      }

      while (this._messageQueue.aj.length > 0) {
        const messageData = this._messageQueue.aj.shift()
        await this._processMessage(messageData)
      }
    } catch (error) {
      this._server.application.consoleMessage({
        message: `Error processing message queue: ${error.message}`,
        type: 'error'
      })
    } finally {
      this._messageQueue.processing = false
      if (this._messageQueue.aj.length > 0 || this._messageQueue.connection.length > 0) {
        setImmediate(() => this._processMessageQueue())
      }
    }
  }

  /**
   * Process a single message from the queue
   * @param {Object} messageData - Message data to process
   * @private
   */
  async _processMessage (messageData) {
    try {
      messageData.message.parse()

      await this._onMessageReceived(messageData)
    } catch (error) {
      this._server.application.consoleMessage({
        message: `Error processing message: ${error.message}`,
        type: 'error'
      })
    }
  }

  /**
   * Sends a connection message
   * @param message
   * @param {Object} options - Send options
   * @returns {Promise<number>}
   * @public
   */
  sendConnectionMessage (message, options = {}) {
    return this._sendMessage(this._connection, message, options)
  }

  /**
   * Sends a remote message
   * @param message
   * @param {Object} options - Send options
   * @returns {Promise<number>}
   * @public
   */
  sendRemoteMessage (message, options = {}) {
    return this._sendMessage(this._aj, message, options)
  }

  /**
   * Sends a message through the provided socket with retry capability
   * @param socket
   * @param message
   * @param {Object} options - Send options
   * @param {number} [options.retries=0] - Number of retries
   * @param {number} [options.retryDelay=200] - Delay between retries in ms
   * @returns {Promise<number>}
   * @private
   */
  async _sendMessage (socket, message, { retries = 0, retryDelay = 200 } = {}) {
    if (message instanceof Message) message = message.toMessage()

    if (!socket.writable || socket.destroyed) {
      throw new Error('Failed to write to socket after end!')
    }

    let attempt = 0
    let lastError

    do {
      try {
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }

        const sendStartTime = Date.now()
        const result = await this._attemptSend(socket, message, sendStartTime)
        return result
      } catch (error) {
        lastError = error
        attempt++

        if (attempt <= retries) {
          this._server.application.consoleMessage({
            message: `Message send failed, retrying (${attempt}/${retries}): ${error.message}`,
            type: 'warn'
          })
        }
      }
    } while (attempt <= retries)

    this._server.application.consoleMessage({
      message: `Message sending error after ${retries + 1} attempts: ${lastError?.message || 'Unknown error'}`,
      type: 'error'
    })
    throw lastError || new Error('Failed to send message')
  }

  /**
   * Attempts to send a single message
   * @param {Socket} socket - The socket to send through
   * @param {string} message - The message to send
   * @param {number} sendStartTime - Timestamp when send was initiated
   * @returns {Promise<number>} - The length of the message sent
   * @private
   */
  async _attemptSend (socket, message, sendStartTime) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup()
        reject(new Error('Message send operation timed out'))
      }, 5000)

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
        clearTimeout(timeout)
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
    })
  }

  /**
   * Handles received message
   * @param {Object} messageData - Message data to process
   * @param {string} messageData.type - Type of the message (aj or connection)
   * @param {Message} messageData.message - The message object
   * @param {string} messageData.packet - The raw message packet
   * @private
   */
  async _onMessageReceived ({ type, message, packet }) {
    this._server.application.dispatch.all({ client: this, type, message })

    if (type === ConnectionMessageTypes.aj && packet.includes('cross-domain-policy')) {
      const crossDomainMessage = `<?xml version="1.0"?>
        <!DOCTYPE cross-domain-policy SYSTEM "http://www.adobe.com/xml/dtds/cross-domain-policy.dtd">
        <cross-domain-policy>
        <allow-access-from domain="*" to-ports="80,443"/>
        </cross-domain-policy>`

      await this.sendConnectionMessage(crossDomainMessage)
      return
    }

    if (type === ConnectionMessageTypes.connection && BLACKLIST_MESSAGES.has(message.type)) {
      await this.sendRemoteMessage(packet)
      return
    }

    if (message.send) {
      if (type === ConnectionMessageTypes.connection) {
        await this.sendRemoteMessage(message)
      } else {
        await this.sendConnectionMessage(message)
      }
    }
  }

  /**
   * Disconnects the session from the remote host and server
   * @param {boolean} manual - Whether this is a manual disconnect
   * @returns {Promise<void>}
   * @public
   */
  async disconnect (manual = false) {
    this._manualDisconnect = manual

    if (this._connection && !this._connection.destroyed) {
      this._connection.destroy()
    }

    if (this._aj && !this._aj.destroyed) {
      this._aj.destroy()
    }

    const { dispatch } = this._server.application
    if (dispatch && dispatch.intervals) {
      dispatch.intervals.forEach((interval) => dispatch.clearInterval(interval))
      dispatch.intervals.clear()
    }

    if (this.connected) {
      this.connected = false

      if (!manual) {
        this._server.application.emit('connection:change', false)
      }
    }

    this._messageQueue.aj = []
    this._messageQueue.connection = []

    if (this._server && this._server.clients) {
      this._server.clients.delete(this)
    }
  }
}

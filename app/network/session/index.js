const { NullProtocol, ProtocolType } = require('../NullProtocol')
const { PromiseSocket } = require('promise-socket')
const PacketManager = require('../PacketManager')
const { EventEmitter } = require('events')
const Packet = require('../packets')

class Session extends EventEmitter {
  constructor (server, socket) {
    super()

    /**
     * References the server instance
     */
    this.server = server

    /**
     * References the socket instance
     */
    this.socket = socket

    /**
     * Remote connection
     */
    this.connection = null

    /**
     * Session properties
     */
    this.properties = {
      settings: {}
    }

    /**
     * Player object
     */
    this.player = {}

    /**
     * Handles incoming packets from the session
     */
    this._sessionProtocol = new NullProtocol(
      ProtocolType.local,
      this
    )

    /**
     * Handles incoming packets from the remote host
     */
    this._connectionProtocol = new NullProtocol(
      ProtocolType.connection,
      this
    )

    /**
     * Local handlers of this packet manager
     */
    this.localHandlers = {}

    /**
     * Remote handlers of this packet manager
     */
    this.connectionHandlers = {}

    /**
     * Packet manager of this session
     */
    this.packetManager = new PacketManager(this)

    /**
     * Intervals set
     */
    this.intervals = new Set()
  }

  /**
   * Initializes the session socket events
   */
  _initialize () {
    this.socket.stream.on('data', data => this._sessionProtocol.chuck(data))
    this.socket.stream.once('close', () => this.disconnect())
  }

  /**
   * Attempts to connect to the remote host
   */
  async connect () {
    try {
      this.connection = new PromiseSocket()

      const { host, port } = core.settings.get('remote')
      await this.connection.connect({ host, port })

      this._initialize()
      this.connection.stream.on('data', data => this._connectionProtocol.chuck(data))
      this.connection.stream.once('close', () => this.disconnect())
    } catch (error) {
      core.console.showMessage({
        message: `Failed connecting to the remote host. ${error.message}.`,
        withStatus: true,
        type: 'error'
      })
    }
  }

  /**
   * Handles packet serialization
   */
  onPacket (type, packet) {
    const toPacket = this.packetManager.validate(packet)

    if (toPacket) {
      toPacket.parse()

      this.packetManager.handle(type, toPacket)

      if (type === ProtocolType.local) {
        core.pluginManager.dispatcher.dispatchLocalHooks(this, toPacket, toPacket.type)
        this.server.emit('packet', { packet, type: 'local' })

        if (toPacket.type === 'verChk' || toPacket.type === 'rndK') {
          toPacket.send = false
          this.remoteWrite(packet)
        }
      } else {
        this.server.emit('packet', { packet, type: 'connection' })
        core.pluginManager.dispatcher.dispatchConnectionHooks(this, toPacket, toPacket.type)
      }

      if (toPacket.send) {
        if (type === ProtocolType.local) this.remoteWrite(toPacket)
        else this.localWrite(toPacket)
      }
    }
  }

  /**
   * Sends the packet to the server
   */
  async remoteWrite (packet) {
    try {
      if (this.connection.socket.writable && !this.connection.socket.destroyed) {
        let toPacket = packet instanceof Packet ? packet.toPacket() : packet
        if (typeof toPacket === 'object') toPacket = JSON.stringify(toPacket)

        return this.connection.write(`${toPacket}\x00`)
      }
    } catch (error) {
      core.console.showMessage({
        message: `Remote send failed! ${error.message}`,
        withStatus: true,
        type: 'error'
      })
    }
  }

  /**
   * Sends the packet to the server
   */
  async localWrite (packet) {
    try {
      if (this.socket.writable && !this.socket.destroyed) {
        let toPacket = packet instanceof Packet ? packet.toPacket() : packet
        if (typeof toPacket === 'object') toPacket = JSON.stringify(toPacket)

        return this.socket.write(`${toPacket}\x00`)
      }
    } catch (error) {
      core.console.showMessage({
        message: `Local send failed! Reason: ${error.message}`,
        withStatus: true,
        type: 'error'
      })
    }
  }

  /**
   * Sends multiple packets
   */
  sendMultiple (packet, type) {
    packet.forEach(async p => {
      if (type === 'local') await this.localWrite(p)
      else await this.remoteWrite(p)
    })
  }

  /**
   * Displays a server admin message
   */
  serverMessage (text) {
    return this.localWrite(`%xt%ua%${text}%0%`)
  }

  /**
   * Sets an interval
   */
  setInterval (fn, delay, ...args) {
    const interval = setInterval(fn, delay, ...args)
    this.intervals.add(interval)
    return interval
  }

  /**
   * Clears an interval
   */
  clearInterval (interval) {
    clearInterval(interval)
    this.intervals.clear(interval)
  }

  /**
   * Disconnects the session from the remote host and server
   */
  async disconnect () {
    await this.connection.end()
    await this.socket.end()
    this.server.onDisconnected()
    return this._destroy()
  }

  /**
   * Distorys the sockets
   */
  async _destroy () {
    await this.connection.destroy()
    await this.socket.destroy()

    for (const interval of this.intervals) this.clearInterval(interval)
    this.intervals.clear()
  }
}

module.exports = Session

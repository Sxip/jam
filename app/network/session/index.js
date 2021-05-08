const { NullProtocol, ProtocolType } = require('../NullProtocol')
const PacketManager = require('../PacketManager')
const { EventEmitter } = require('events')
const Packet = require('../packets')
const tls = require('tls')
const { promises } = require('dns')

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
    this.connection = new tls.TLSSocket()

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
    this.socket.on('data', data => this._sessionProtocol.chuck(data))
    this.socket.once('close', () => this.disconnect())
  }

  /**
   * Attempts to connect to the remote host
   */
  async connect () {
    try {
      await new Promise((resolve, reject) => {
        if (this.connection.destroyed) reject(new Error('The socket is destroyed.'));

        const onError = err => {
          this.connection.off('error', onError);
          this.connection.off('connect', onConnected);
          reject(err);
        };
  
        const onConnected = () => {
          this.connection.off('error', onError);
          this.connection.off('connect', onConnected);
          resolve();
        };
  
        this.connection.once('error', onError);
        this.connection.once('connect', onConnected);

        const { host, port } = core.settings.get('remote')
        this.connection.connect({
          host, 
          port, 
          rejectUnauthorized: false
        });
      });

      this._initialize()

      this.connection.on('data', data => this._connectionProtocol.chuck(data))
      this.connection.once('close', () => this.disconnect())
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

        if (toPacket.type === 'verChk' || toPacket.type === 'rndK' || toPacket.type === 'login') {
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
    packet = packet instanceof Packet ? packet.toPacket() : packet

    try {
      await new Promise((resolve, reject) => {
        if (!this.connection.writable || this.connection.destroyed) reject(new Error('Failed to write to remote after end!'));
        if (typeof packet === 'object') packet = JSON.stringify(packet)

        const onceError = err => {
          this._rejected = true;
          reject(err);
        };
  
        if (this.connection.write(`${packet}\x00`)) {
          this.connection.off('error', onceError);
          if (!this._rejected) return resolve(packet.length);
        }
  
        const onceDrain = () => {
          this.connection.off('close', onceClose);
          this.connection.off('error', onceError);
          resolve(packet.length);
        };
  
        const onceClose = () => {
          this.connection.off('drain', onceDrain);
          this.connection.off('error', onceError);
          resolve(packet.length);
        };
  
        this.connection.once('error', onceError);
        this.connection.once('close', onceClose);
        this.connection.once('drain', onceDrain);
      });
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
    packet = packet instanceof Packet ? packet.toPacket() : packet

    try {
      await new Promise((resolve, reject) => {
        if (!this.socket.writable || this.socket.destroyed) reject(new Error('Failed to write to local after end!'));
        if (typeof packet === 'object') packet = JSON.stringify(packet)
  
        const onceError = err => {
          this._rejected = true;
          reject(err);
        };
        
        if (this.socket.write(`${packet}\x00`)) {
          this.socket.off('error', onceError);
          if (!this._rejected) return resolve(packet.length);
        }
  
        const onceDrain = () => {
          this.socket.off('close', onceClose);
          this.socket.off('error', onceError);
          resolve(packet.length);
        };
  
        const onceClose = () => {
          this.socket.off('drain', onceDrain);
          this.socket.off('error', onceError);
          resolve(packet.length);
        };
  
        this.socket.once('error', onceError);
        this.socket.once('close', onceClose);
        this.socket.once('drain', onceDrain);
      });
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
  sendMultiple (packets, type) {
    const promise = []

    for (const packet of packets) {
      type === 'local' ? promise.push(this.localWrite(packet)) : promises.push(this.remoteWrite(packet))
    }

    return Promise.all(promises)
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
    this.connection.end()
    this.socket.end()
    this.server.onDisconnected()
    return this._destroy()
  }

  /**
   * Distorys the sockets
   */
  async _destroy () {
    this.connection.destroy()
    this.socket.destroy()

    for (const interval of this.intervals) this.clearInterval(interval)
    this.intervals.clear()
  }
}

module.exports = Session

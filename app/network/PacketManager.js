const JsonPacket = require('./packets/JsonPacket')
const XmlPacket = require('./packets/XmlPacket')
const XtPacket = require('./packets/XtPacket')
const { ProtocolType } = require('./NullProtocol')

class PacketManager {
  constructor(session) {
    this.session = session

    /**
     * Local handlers
     */
    this.regsiterLocalHandler('pubMsg', require('./handlers/local/Chat'))

    /**
     * Connection handlers
     */
    this.regsiterRemoteHandler('login', require('./handlers/connection/Login'))
  }

  /**
   * Validates the packet
   */
  validate(packet) {
    if (packet.indexOf('<') !== -1 && packet.lastIndexOf('>') !== -1) return new XmlPacket(packet)
    if (packet.indexOf('%') !== -1 && packet.lastIndexOf('%') !== -1) return new XtPacket(packet)
    if (packet.indexOf('{') !== -1 && packet.lastIndexOf('}') !== -1) return new JsonPacket(packet)
    return null
  }

  /**
   * Handles packet handlers
   */
  handle(type, packet) {
    switch (type) {
      case ProtocolType.local:
        if (this.session.localHandlers[packet.type]) this.session.localHandlers[packet.type].handle(packet)
        break

      case ProtocolType.connection:
        if (this.session.connectionHandlers[packet.type]) this.session.connectionHandlers[packet.type].handle(packet)
        break
    }
  }

  /**
       * Regsiters a local handler
       */
  regsiterLocalHandler(event, Handler) {
    this.session.localHandlers[event] = new Handler(this)
  }

  /**
   * Regsiters a remote handler
   */
  regsiterRemoteHandler(event, Handler) {
    this.session.connectionHandlers[event] = new Handler(this)
  }
}

module.exports = PacketManager

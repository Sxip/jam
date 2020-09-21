const { PromiseSocket } = require('promise-socket')
const { EventEmitter } = require('events')
const { createServer } = require('net')
const Session = require('./session')
const Events = require('../core/Events')

class TCPServer extends EventEmitter {
  constructor () {
    super()

    /**
     * References the connected session
     */
    this.session = null
  }

  /**
   * Create socket and begin listening for new connections
   */
  serve () {
    return new Promise((resolve, reject) => {
      if (this.server) reject(new Error('The server has already been instantiated.'))

      this.server = createServer(socket => this._onConnection(socket))
        .once('listening', () => resolve())
        .once('error', error => reject(error))

      this.server.listen(443)
    })
  }

  /**
   * Closes the server
   */
  close () {
    return new Promise((resolve, reject) => {
      this.server.close(error => {
        if (error) reject(error)
        else resolve()
      })
    })
  }

  /**
   * Handles new incoming connections
   */
  _onConnection (socket) {
    this.session = new Session(
      this,
      new PromiseSocket(socket)
    )

    this.session.connect()
    this.emit(Events.new_connection, this.session)
  }

  /**
   * Handles disconnection
   */
  onDisconnected () {
    this.emit(Events.connection_disconnected, this.session)
  }
}

module.exports = TCPServer

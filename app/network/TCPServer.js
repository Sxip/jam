const { EventEmitter } = require('events')
const Session = require('./session')
const Events = require('../core/Events')
const { Server } = require('net')

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
  async serve () {
    await new Promise((resolve, reject) => {
      if (this.server) reject(new Error('The server has already been instantiated.'));

      this.server = new Server();

      const dispose = () => {
        this.server.off('listening', onceListening)
        this.server.off('error', onceError)
        this.server.off('close', onceClose)
      };

      const onceListening = () => {
        resolve();
      };

      const onceClose = error => {
        dispose();
        reject(error);
      };

      const onceError = () => {
        dispose();
      };

      this.server.once('listening', onceListening)
      this.server.once('error', onceError)

      this.server.listen(443);
    });

    this.server.on('connection', this._onConnection.bind(this));
    this.server.on('error', this.onError.bind(this));
  }

  /**
   * Closes the server
   */
  async close () {
    await new Promise((resolve, reject) => {
      this.server.close(error => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  /**
   * Handles new incoming connections
   */
  _onConnection (socket) {
    this.session = new Session(
      this,
      socket
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

  /**
   * Handles server errors
   */
  onError(error) {
    core.console.showMessage({
      message: `Server error! ${error.message}`,
      withStatus: true,
      type: 'error'
    })
  }
}

module.exports = TCPServer

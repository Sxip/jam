const childProcess = require('child_process');
const { EventEmitter } = require('events');

class Process extends EventEmitter {
  constructor(file) {
    super();

    /**
     * File path of the spawner
     */
    this._file = file;

    /**
     * Process of the server
     */
    this._process = null;
  }

  /**
   * Forks a child process
   */
  spawn() {
    return new Promise((resolve, reject) => {
      if (this._process) reject(new Error('Process already exsists.'));

      this._process = childProcess.fork(this._file)
        .on('message', message => this._onMessage(message))
        .once('error', error => reject(error));
      resolve();
    });
  }

  /**
   * Handles messages from the child process
   */
  _onMessage(message) {
    // Handle process events
  }

  /**
   * Sends data to the child process
   * @public
   */
  send(data = {}) {
    return new Promise((resolve, reject) => {
      this._process.send(data, error => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

module.exports = Process;


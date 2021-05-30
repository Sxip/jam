const { ipcRenderer } = require('electron')
const { EventEmitter } = require('events')
const Server = require('../../../networking/server')
const Settings = require('./settings')
const Patcher = require('./patcher')

/**
 * Message status icons.
 * @type {Object}
 * @constant
 */
const messageStatus = Object.freeze({
  success: {
    icon: '✔️'
  },
  wait: {
    icon: '⏳'
  },
  celebrate: {
    icon: '✨'
  },
  warn: {
    icon: '⚠️'
  },
  speech: {
    icon: '💬'
  },
  error: {
    icon: '❌'
  }
})

module.exports = class Application extends EventEmitter {
  /**
   * Constructor.
   * @constructor
   */
  constructor () {
    super()

    /**
     * The reference to the server connection.
     * @type {Server}
     * @public
     */
    this.server = new Server(this)

    /**
     * The reference to the settings manager.
     * @type {Settings}
     * @public
     */
    this.settings = new Settings()

    /**
     * The reference to the patcher manager.
     * @type {Patcher}
     * @public
     */
    this.patcher = new Patcher(this)

    /**
     * The reference to the application input.
     * @type {JQuery<HTMLElement>}
     * @private
     */
    this._input = $('#input')

    /**
     * Handles the input events.
     * @type {void}
     * @public
     */
    this._input.on('keydown', event => {
      const key = event.key

      if (key === 'Enter') {
        const message = this._input.val().trim()

        // Todo: handle commands
        const parameters = message.split(' ')
        const command = parameters.shift()

        this._input.val('')
      }
    })
  }

  /**
   * Minimizes the application.
   * @public
   */
  minimize () {
    ipcRenderer.send('window-minimize')
  }

  /**
   * Shows a remote modal.
   * @param {string} id
   * @public
   */
  remoteModal (target, event, id) {
    event.preventDefault()

    const content = $('.modal-content')

    content.load(
      $(target).attr('modal'), () => $(id).modal('show')
    )
  }

  /**
   * Displays a new console message.
   * @param message
   * @public
   */
  consoleMessage ({ message, type = 'success', withStatus = true, time = true } = {}) {
    const container = $('<div>')
    const timeContainer = $('<div>')
    const messageContainer = $('<div>')

    /**
     * Displays the message with the status type.
     * @function
     */
    const status = (type, message) => {
      const status = messageStatus[type]
      if (!status) throw new Error('Invalid Status Type.')

      return `${twemoji.parse(status.icon)} ${message || ''}`
    }

    /**
     * Gets the current timestamp.
     * @function
     */
    const getTime = () => {
      const time = new Date()
      const hour = time.getHours()
      const minute = time.getMinutes()
      const timeString = `${hour}:${minute}`

      return timeString
    }

    if (time) {
      timeContainer.addClass('time')
      timeContainer.text(getTime())
      container.append(timeContainer)
    }

    container.addClass(`message ${type || ''}`)

    if (withStatus) messageContainer.append(status(type, message))
    else messageContainer.append(message)

    messageContainer.addClass('message-content')
    container.append(messageContainer)
    $('#messages').append(container)
  }

  /**
   * Opens Animal Jam Classic
   */
  openAnimalJam () {
    try {
      return this.patcher.killProcessAndPatch()
    } catch (error) {
      this.consoleMessage({
        message: `Unexpected error occurred while trying to patch Animal Jam Classic. ${error.message}`,
        type: 'error'
      })
    }
  }

  /**
   * Instantiates the application.
   * @returns {Promise<void>}
   * @public
   */
  async instantiate () {
    try {
      await this.settings.load()
      await this.server.serve()
    } catch (error) {
      this.consoleMessage({
        message: `Unexpected error occurred while trying to instantiate jam. ${error.message}`,
        type: 'error'
      })
    }
  }
}

const { ipcRenderer } = require('electron')
const { EventEmitter } = require('events')
const Server = require('../../../networking/server')
const Settings = require('./settings')
const Patcher = require('./patcher')
const Dispatch = require('./dispatch')

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
  notify: {
    icon: '🔔'
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
     * The reference to the dispatch.
     * @type {Dispatch}
     * @public
     */
    this.dispatch = new Dispatch(this)

    /**
     * The reference to the application input.
     * @type {JQuery<HTMLElement>}
     * @private
     */
    this._input = $('#input')

    /**
     * Handles the input events.
     * @type {void}
     * @private
     */
    this._input.on('keydown', event => {
      const key = event.key

      if (key === 'Enter') {
        const message = this._input.val().trim()

        const parameters = message.split(' ')
        const command = parameters.shift()

        const cmd = this.dispatch.commands.get(command)
        if (cmd) cmd.callback({ parameters })

        this._input.val('')
      }
    })
  }

  /**
   * Opens the plugin directory.
   * @param name
   * @public
   */
  directory (name) {
    const plugin = this.dispatch.plugins.get(name)

    if (plugin) {
      const { filepath } = plugin
      ipcRenderer.send('open-directory', filepath)
    }
  }

  /**
   * Minimizes the application.
   * @public
   */
  minimize () {
    ipcRenderer.send('window-minimize')
  }

  /**
   * Closes the application.
   * @public
   */
  close () {
    ipcRenderer.send('window-close')
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
      $(target).attr('modal'), () => {
        $(id).modal()
      }
    )
  }

  /**
   * Handles input autocomplete activation.
   * @type {void}
   * @public
   */
  activateAutoComplete () {
    /**
     * Renders the autocomplete items.
     * @param ul
     * @param item
     * @returns
     */
    const renderItems = (ul, item) => {
      return $('<li>')
        .data('ui-autocomplete-item', item)
        .append(`<a>${item.value}</a> <a class="float-right description">${item.item}</a>`)
        .appendTo(ul)
    }

    this._input.autocomplete({
      source: Array.from(this.dispatch.commands.values())
        .map(command => ({
          value: command.name,
          item: command.description
        })),
      position: { collision: 'flip' }
    })
      .data('ui-autocomplete')._renderItem = renderItems
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
   * @returns {Promise<void>}
   * @public
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
      await this.dispatch.load()
      await this.server.serve()

      this.emit('ready')
    } catch (error) {
      this.consoleMessage({
        message: `Unexpected error occurred while trying to instantiate jam. ${error.message}`,
        type: 'error'
      })
    }
  }
}

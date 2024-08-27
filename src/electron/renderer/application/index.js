/* eslint-disable camelcase */
const { ipcRenderer } = require('electron')
const { EventEmitter } = require('events')
const Server = require('../../../networking/server')
const Settings = require('./settings')
const Patcher = require('./patcher')
const Dispatch = require('./dispatch')
const HttpClient = require('../../../services/HttpClient')

/**
 * Message status icons.
 * @type {Object}
 * @constant
 */
const messageStatus = Object.freeze({
  success: {
    icon: 'success.png'
  },
  logger: {
    icon: 'logger.png'
  },
  action: {
    icon: 'action.png'
  },
  wait: {
    icon: 'wait.png'
  },
  celebrate: {
    icon: 'celebrate.png'
  },
  warn: {
    icon: 'warn.png'
  },
  notify: {
    icon: 'notify.png'
  },
  speech: {
    icon: 'speech.png'
  },
  error: {
    icon: 'error.png'
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
    this.$input = $('#input')

    /**
     * The reference to the plugin list.
     * @type {JQuery<HTMLElement>}
     * @private
     */
    this.$pluginList = $('#pluginList')

    /**
     * The reference to the realtime server.
     * @type {Realtime}
     * @public
     */
    this.realtime = null

    /**
     * Handles the input events.
     * @type {void}
     * @private
     */
    this.$input.on('keydown', (event) => {
      if (event.key === 'Enter') {
        const message = this.$input.val().trim()
        const [command, ...parameters] = message.split(' ')

        const cmd = this.dispatch.commands.get(command)
        if (cmd) {
          cmd.callback({ parameters })
        }

        this.$input.val('')
      }
    })
  }

  /**
   * Checks if the Animal Jam server host has changed.
   * @returns {Promise<void>}
   * @privte
   */
  async _checkForHostChanges () {
    try {
      // Fetch the data using HttpClient
      const data = await HttpClient.fetchFlashvars()
      let { smartfoxServer } = data

      // Modify the smartfoxServer string
      smartfoxServer = smartfoxServer.replace(/\.(stage|prod)\.animaljam\.internal$/, '-$1.animaljam.com')
      smartfoxServer = `lb-${smartfoxServer}`

      // Update settings if there is a change
      if (smartfoxServer !== this.settings.get('smartfoxServer')) {
        this.settings.update('smartfoxServer', smartfoxServer)

        this.consoleMessage({
          message: 'Server host has changed. Changes are now being applied.',
          type: 'notify'
        })
      }
    } catch (error) {
      console.error(`Unexpected error occurred while trying to check for host changes: ${error.message}`)
    }
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
   * Opens the settings json file.
   * @public
   */
  openSettings () {
    ipcRenderer.send('open-settings', this.settings.path)
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
   * Relaunches the application.
   * @public
   */
  relaunch () {
    ipcRenderer.send('application-relaunch')
  }

  /**
   * Attaches networking events.
   * @public
   */
  attachNetworkingEvents () {
    this.dispatch.onMessage({
      type: '*',
      callback: ({ message, type }) => {
        this.consoleMessage({
          type: 'speech',
          isPacket: true,
          isIncoming: type === 'aj',
          message: message.toMessage()
        })
      }
    })
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
        .addClass('autocomplete-item ui-menu-item')
        .data('ui-autocomplete-item', item)
        .append(`
          <div class="autocomplete-item-content">
            <span class="autocomplete-item-name">${item.value}</span>
            <span class="autocomplete-item-description">${item.item}</span>
          </div>
        `)
        .appendTo(ul)
    }

    this.$input.autocomplete({
      source: Array.from(this.dispatch.commands.values()).map(command => ({
        value: command.name,
        item: command.description
      })),
      position: { my: 'left top', at: 'left bottom', collision: 'flip' },
      classes: {
        'ui-autocomplete': 'bg-secondary-bg border border-sidebar-border rounded-lg shadow-lg z-50'
      },
      _renderItem: function (ul, item) {
        return renderItems(ul, item)
      }
    }).data('ui-autocomplete')._resizeMenu = function () {
      const inputWidth = this.element.outerWidth()
      this.menu.element.css({ width: inputWidth + 'px' })
    }
  }

  /**
   * Refreshes the autocomplete source.
   * @public
   */
  refreshAutoComplete () {
    this.$input.autocomplete('option', {
      source:
        Array.from(this.dispatch.commands.values())
          .map(command => ({
            value: command.name,
            item: command.description
          }))
    })
  }

  /**
   * Displays a new console message.
   * @param message
   * @public
   */
  consoleMessage ({ message, type = 'success', withStatus = true, time = true, isPacket = false, isIncoming = false } = {}) {
    const createElement = (tag, classes = '', content = '') => {
      return $('<' + tag + '>').addClass(classes).html(content)
    }

    const status = (type, message) => {
      const statusInfo = messageStatus[type]
      if (!statusInfo) throw new Error('Invalid Status Type.')
      return `<img src="file:///../../../../assets/icons/${statusInfo.icon}" class="w-4 h-4 mr-2 opacity-80 align-middle" /> ${message || ''}`
    }

    const getTime = () => {
      const now = new Date()
      const hour = String(now.getHours()).padStart(2, '0')
      const minute = String(now.getMinutes()).padStart(2, '0')
      return `${hour}:${minute}`
    }

    // Define base type classes
    const baseTypeClasses = {
      success: 'bg-highlight-green bg-opacity-20 border-highlight-green text-highlight-green',
      error: 'bg-error-red bg-opacity-20 border-error-red text-white',
      info: 'bg-primary-bg bg-opacity-20 border-primary-bg text-text-primary',
      warning: 'bg-highlight-yellow bg-opacity-20 border-highlight-yellow text-primary-bg'
    }

    const packetTypeClasses = {
      incoming: 'bg-tertiary-bg bg-opacity-20 border-tertiary-bg text-text-primary',
      outgoing: 'bg-highlight-green bg-opacity-20 border-highlight-green text-highlight-green'
    }

    const $container = createElement('div', 'flex items-center p-3 rounded-lg border mb-2 max-w-full w-full')

    if (time) {
      const $timeContainer = createElement('div', 'text-xs text-gray-500 mr-2', getTime())
      $container.append($timeContainer)
    }

    if (isPacket) {
      $container.addClass(packetTypeClasses[isIncoming ? 'incoming' : 'outgoing'])
    } else {
      $container.addClass(baseTypeClasses[type] || 'bg-tertiary-bg bg-opacity-20 border-tertiary-bg text-text-primary')
    }

    const $messageContainer = createElement('div', 'flex-1 text-sm flex items-center')

    if (withStatus && !isPacket) {
      $messageContainer.html(status(type, message))
    } else {
      $messageContainer.text(message)
    }

    $messageContainer.css({
      overflow: 'hidden',
      'text-overflow': 'clip',
      'white-space': 'normal',
      'word-break': 'break-word'
    })

    $container.append($messageContainer)

    if (isPacket) {
      $('#message-log').append($container)
    } else {
      $('#messages').append($container)
    }
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
   * Renders a plugin item
   * @param {Object} plugin
   * @returns {JQuery<HTMLElement>}
   */
  renderPluginItems ({ name, type, description, author } = {}) {
    const iconClass = type === 'ui' ? 'fas fa-desktop' : type === 'game' ? 'fas fa-gamepad' : ''

    const badge = iconClass
      ? $('<span>', {
        class: 'badge bg-custom-pink text-white-200 rounded-full text-xs px-2 py-1 ml-2 flex items-center'
      }).append($('<i>', { class: iconClass }))
      : null

    const hoverClass = type === 'ui' ? 'hover:bg-tertiary-bg cursor-pointer' : ''
    const onClickEvent = type === 'ui' ? `jam.application.dispatch.open('${name}')` : ''

    const $listItem = $('<li>', {
      class: `flex flex-col p-2 border-b border-sidebar-border bg-secondary-bg ${hoverClass}`,
      click: onClickEvent ? () => eval(onClickEvent) : null
    })

    const $title = $('<div>', { class: 'flex items-center' })
      .append($('<span>', { class: 'text-text-primary font-semibold', text: name }))
      .append(badge)

    const $description = $('<span>', { class: 'text-gray-400 text-sm mt-1', text: description })
    const $author = $('<span>', { class: 'text-gray-500 text-xs mt-1', text: `Author: ${author}` })

    $listItem.append($title, $description, $author)
    this.$pluginList.prepend($listItem)
  }

  /**
   * Instantiates the application.
   * @returns {Promise<void>}
   * @public
   */
  async instantiate () {
    await Promise.all([
      this.settings.load(),
      this.dispatch.load()
    ])

    /**
     * Simple check for the host changes for animal jam classic.
     */
    const secureConnection = this.settings.get('secureConnection')
    if (secureConnection) await this._checkForHostChanges()

    await this.server.serve()
    this.emit('ready')
  }
}

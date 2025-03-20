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
      const data = await HttpClient.fetchFlashvars()
      let { smartfoxServer } = data

      smartfoxServer = smartfoxServer.replace(/\.(stage|prod)\.animaljam\.internal$/, '-$1.animaljam.com')
      smartfoxServer = `lb-${smartfoxServer}`

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
  consoleMessage({ message, type = 'success', withStatus = true, time = true, isPacket = false, isIncoming = false } = {}) {
    const createElement = (tag, classes = '', content = '') => {
      return $('<' + tag + '>').addClass(classes).html(content)
    }
  
    const status = (type, message) => {
      const statusInfo = messageStatus[type]
      if (!statusInfo) throw new Error('Invalid Status Type.')
      return `
        <div class="flex items-center space-x-2">
          <img src="file:///../../../../assets/icons/${statusInfo.icon}" class="w-4 h-4 opacity-80" />
          <span>${message || ''}</span>
        </div>
      `
    }
  
    const getTime = () => {
      const now = new Date()
      const hour = String(now.getHours()).padStart(2, '0')
      const minute = String(now.getMinutes()).padStart(2, '0')
      return `${hour}:${minute}`
    }
  
    const baseTypeClasses = {
      success: 'bg-highlight-green/10 border-highlight-green text-highlight-green',
      error: 'bg-error-red/10 border-error-red text-error-red',
      info: 'bg-primary-bg/10 border-primary-bg text-text-primary',
      warning: 'bg-highlight-yellow/10 border-highlight-yellow text-highlight-yellow'
    }
  
    const packetTypeClasses = {
      incoming: 'bg-tertiary-bg/10 border-tertiary-bg text-text-primary',
      outgoing: 'bg-highlight-green/10 border-highlight-green text-highlight-green'
    }
  
    const $container = createElement(
      'div',
      'flex items-center p-2 rounded-md border mb-1 shadow-sm max-w-full w-full'
    )
  
    // Add time if enabled
    if (time) {
      const $timeContainer = createElement('div', 'text-xs text-gray-500 mr-2', getTime())
      $container.append($timeContainer)
    }
  
    if (isPacket) {
      $container.addClass(packetTypeClasses[isIncoming ? 'incoming' : 'outgoing'])
    } else {
      $container.addClass(baseTypeClasses[type] || 'bg-tertiary-bg/10 border-tertiary-bg text-text-primary')
    }
  
    const $messageContainer = createElement('div', 'flex-1 text-xs flex items-center space-x-2')
  
    if (withStatus && !isPacket) {
      $messageContainer.html(status(type, message))
    } else {
      $messageContainer.text(message)
    }
  
    $messageContainer.css({
      overflow: 'hidden', // Prevent content from overflowing
      'text-overflow': 'ellipsis', // Add ellipsis for long text
      'white-space': 'normal', // Allow text to wrap to the next line
      'word-break': 'break-word' // Break long words to prevent overflow
    })
  
    $container.append($messageContainer)
  
    // Append to the appropriate log
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
  renderPluginItems({ name, type, description, author } = {}) {
    const iconClass = type === 'ui' ? 'fas fa-desktop' : type === 'game' ? 'fas fa-gamepad' : ''
  
    const badge = iconClass
      ? $('<span>', {
          class: 'badge bg-custom-pink text-white rounded-full text-xs px-2 py-1 flex items-center'
        }).append($('<i>', { class: iconClass }))
      : null
  
    const onClickEvent = type === 'ui' ? () => jam.application.dispatch.open(name) : null
  
    const hoverClass = type === 'ui' ? 'hover:bg-tertiary-bg hover:shadow-md transition duration-200 cursor-pointer' : ''
    const $listItem = $('<li>', {
      class: `flex flex-col gap-2 p-3 border border-sidebar-border bg-secondary-bg rounded-md ${hoverClass}`,
      click: onClickEvent
    })
  
    const $title = $('<div>', { class: 'flex items-center justify-between' })
      .append($('<span>', { class: 'text-text-primary font-medium text-base', text: name }))
      .append(badge)
  
    const $description = $('<p>', {
      class: 'text-gray-400 text-xs leading-snug',
      text: description
    })
  
    const $author = $('<span>', {
      class: 'text-gray-500 text-xs italic',
      text: `Author: ${author}`
    })
  
    $listItem.append($title, $description, $author)
  
    if (type === 'ui') {
      this.$pluginList.prepend($listItem)
    } else {
      this.$pluginList.append($listItem)
    }
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

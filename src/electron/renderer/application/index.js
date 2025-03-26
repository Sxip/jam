/* eslint-disable camelcase */
const { ipcRenderer } = require('electron')
const { EventEmitter } = require('events')
const Server = require('../../../networking/server')
const Settings = require('./settings')
const Patcher = require('./patcher')
const Dispatch = require('./dispatch')
const HttpClient = require('../../../services/HttpClient')
const ModalSystem = require('./modals')

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
     * Stores the modal system.
     * @type {ModalSystem}
     * @public
     */
    this.modals = new ModalSystem(this)
    this.modals.initialize().catch(error => {
      console.error('Failed to initialize modal system:', error)
    })

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

  open (url) {
    ipcRenderer.send('open-url', url)
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
   * Opens the settings modal.
   * @returns {void}
   * @public
   */
  openSettings () {
    this.modals.show('settings', '#modalContainer')
  }

  openAbout () {
    this.modals.show('pluginLibraryModal', '#modalContainer')
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
    this.$input.autocomplete({
      source: Array.from(this.dispatch.commands.values()).map(command => ({
        value: command.name,
        description: command.description
      })),
      position: { my: 'left top', at: 'left bottom', collision: 'flip' },
      classes: {
        'ui-autocomplete': 'bg-secondary-bg border border-sidebar-border rounded-lg shadow-lg z-50'
      },
      create: function () {
        $(this).data('ui-autocomplete')._resizeMenu = function () {
          this.menu.element.css({ width: this.element.outerWidth() + 'px' })
        }
      },
      select: function (event, ui) {
        this.value = ui.item.value
        return false
      }
    }).autocomplete('instance')._renderItem = function (ul, item) {
      return $('<li>')
        .addClass('autocomplete-item ui-menu-item')
        .append(`
          <div class="autocomplete-item-content">
            <span class="autocomplete-item-name">${item.value}</span>
            <span class="autocomplete-item-description">${item.description}</span>
          </div>
        `)
        .appendTo(ul)
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
            description: command.description
          }))
    })
  }

  /**
   * Displays a new console message.
   * @param message
   * @public
   */
  consoleMessage ({ message, type = 'success', withStatus = true, time = true, isPacket = false, isIncoming = false, details = null } = {}) {
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
      const second = String(now.getSeconds()).padStart(2, '0')
      return `${hour}:${minute}:${second}`
    }

    const baseTypeClasses = {
      success: 'bg-highlight-green/10 border-highlight-green text-highlight-green',
      error: 'bg-error-red/10 border-error-red text-error-red',
      info: 'bg-primary-bg/10 border-primary-bg text-text-primary',
      warning: 'bg-highlight-yellow/10 border-highlight-yellow text-highlight-yellow'
    }

    const packetTypeClasses = {
      incoming: 'bg-tertiary-bg/20 border-tertiary-bg text-text-primary',
      outgoing: 'bg-highlight-green/10 border-highlight-green text-highlight-green'
    }

    const $container = createElement(
      'div',
      isPacket
        ? 'flex items-center p-2 rounded-md border mb-1 shadow-sm max-w-full w-full'
        : 'flex items-center p-2 rounded-md border mb-1 shadow-sm max-w-full w-full'
    )

    if (isPacket) {
      $container.addClass(packetTypeClasses[isIncoming ? 'incoming' : 'outgoing'])
    } else {
      $container.addClass(baseTypeClasses[type] || 'bg-tertiary-bg/10 border-tertiary-bg text-text-primary')
    }

    if (isPacket) {
      const iconClass = isIncoming ? 'fa-arrow-down text-highlight-green' : 'fa-arrow-up text-highlight-yellow'
      $container.append(`<i class="fas ${iconClass} mr-1 hidden"></i>`)
    } else if (time) {
      const $timeContainer = createElement('div', 'text-xs text-gray-500 mr-2', getTime())
      $container.append($timeContainer)
    }

    const $messageContainer = createElement(
      'div',
      isPacket
        ? 'text-xs text-text-primary break-all flex-1'
        : 'flex-1 text-xs flex items-center space-x-2'
    )

    if (withStatus && !isPacket) {
      $messageContainer.html(status(type, message))
    } else {
      $messageContainer.text(message)
    }

    $messageContainer.css({
      overflow: 'hidden',
      'text-overflow': 'ellipsis',
      'white-space': 'normal',
      'word-break': 'break-word'
    })

    $container.append($messageContainer)

    if (isPacket && details) {
      const $detailsButton = createElement(
        'button',
        'text-xs text-gray-400 mt-2 hover:text-text-primary transition-colors',
        '<i class="fas fa-code mr-1"></i> View Details'
      )

      const $detailsContainer = createElement(
        'div',
        'bg-tertiary-bg rounded p-2 mt-2 hidden',
        `<pre class="text-xs text-text-primary overflow-auto">${JSON.stringify(details, null, 2)}</pre>`
      )

      $detailsButton.on('click', () => {
        $detailsContainer.toggleClass('hidden')
        const isHidden = $detailsContainer.hasClass('hidden')
        $detailsButton.html(
          isHidden
            ? '<i class="fas fa-code mr-1"></i> View Details'
            : '<i class="fas fa-chevron-up mr-1"></i> Hide Details'
        )
      })

      $container.append($detailsButton, $detailsContainer)
    }

    if (isPacket) {
      const $totalCount = $('#totalCount')
      const $incomingCount = $('#incomingCount')
      const $outgoingCount = $('#outgoingCount')

      const totalCount = parseInt($totalCount.text() || '0', 10) + 1
      $totalCount.text(totalCount)

      if (isIncoming) {
        const incomingCount = parseInt($incomingCount.text() || '0', 10) + 1
        $incomingCount.text(incomingCount)
      } else {
        const outgoingCount = parseInt($outgoingCount.text() || '0', 10) + 1
        $outgoingCount.text(outgoingCount)
      }

      $('#message-log').append($container)

      const $messageLog = $('#message-log')
      const isAtBottom = $messageLog.scrollTop() + $messageLog.innerHeight() >= $messageLog[0].scrollHeight - 30
      if (isAtBottom) {
        $messageLog.scrollTop($messageLog[0].scrollHeight)
      }
    } else {
      $('#messages').append($container)
    }

    if (window.applyFilter) window.applyFilter()
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

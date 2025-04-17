/* eslint-disable camelcase */
const { ipcRenderer } = require('electron')
const { EventEmitter } = require('events')
const Server = require('../../../networking/server')
const Settings = require('./settings')
const Patcher = require('./patcher')
const Dispatch = require('./dispatch')
const HttpClient = require('../../../services/HttpClient')
const ModalSystem = require('./modals')

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
    this.modals.initialize()

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

  /**
   * Opens plugins hub.
   */
  openPluginHub () {
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
    if (!$('#autocomplete-styles').length) {
      $('head').append(`
        <style id="autocomplete-styles">
          .ui-autocomplete {
            max-height: 280px;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 8px;
            backdrop-filter: blur(8px);
            scrollbar-width: thin;
            scrollbar-color: #3A3D4D #1C1E26;
          }
          .ui-autocomplete::-webkit-scrollbar {
            width: 8px;
          }
          .ui-autocomplete::-webkit-scrollbar-track {
            background: #1C1E26;
          }
          .ui-autocomplete::-webkit-scrollbar-thumb {
            background: #3A3D4D;
            border-radius: 8px;
          }
          .ui-autocomplete::-webkit-scrollbar-thumb:hover {
            background: #5A5F6D;
          }
          .autocomplete-item {
            padding: 6px !important;
            border-radius: 6px;
            margin-bottom: 4px;
            border: 1px solid transparent;
            transition: all 0.15s ease;
          }
          .autocomplete-item {
            padding: 6px !important;
            border-radius: 6px;
            margin-bottom: 4px;
            border: 1px solid transparent;
            transition: all 0.15s ease;
          }
          .autocomplete-item.ui-state-focus {
            border: 1px solid rgba(52, 211, 153, 0.5) !important;
            background: rgba(52, 211, 153, 0.1) !important;
            margin: 0 0 4px 0 !important;
          }
          .autocomplete-item-content {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .autocomplete-item-name {
            font-size: 14px;
            font-weight: 500;
            color: var(--text-primary, #e2e8f0);
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .autocomplete-item-description {
            font-size: 12px;
            opacity: 0.7;
            color: var(--text-secondary, #a0aec0);
            margin-left: 16px;
          }
          .autocomplete-shortcut {
            margin-top: 4px;
            font-size: 10px;
            color: rgba(160, 174, 192, 0.6);
            display: flex;
            justify-content: flex-end;
          }
          .autocomplete-shortcut kbd {
            background: rgba(45, 55, 72, 0.6);
            border-radius: 3px;
            padding: 1px 4px;
            margin: 0 2px;
            border: 1px solid rgba(160, 174, 192, 0.2);
            font-family: monospace;
          }
        </style>
      `)
    }

    this.$input.autocomplete({
      source: Array.from(this.dispatch.commands.values()).map(command => ({
        value: command.name,
        description: command.description
      })),
      position: { my: 'left top', at: 'left bottom', collision: 'flip' },
      classes: {
        'ui-autocomplete': 'bg-secondary-bg/95 border border-sidebar-border rounded-lg shadow-lg z-50'
      },
      delay: 50,
      minLength: 0,
      create: function () {
        $(this).data('ui-autocomplete')._resizeMenu = function () {
          this.menu.element.css({ width: this.element.outerWidth() + 'px' })
        }
      },
      select: function (event, ui) {
        this.value = ui.item.value
        return false
      },
      focus: function (event, ui) {
        $('.autocomplete-item').removeClass('scale-[1.01]')
        $(event.target).closest('.autocomplete-item').addClass('scale-[1.01]')
        return false
      },
      open: function () {
        const $menu = $(this).autocomplete('widget')
        $menu.css('opacity', 0)
          .animate({ opacity: 1 }, 150)
      },
      close: function () {
        const $menu = $(this).autocomplete('widget')
        $menu.animate({ opacity: 0 }, 100)
      }
    }).autocomplete('instance')._renderMenu = function (ul, items) {
      const that = this

      items.forEach(item => {
        that._renderItemData(ul, item)
      })
    }

    this.$input.autocomplete('instance')._renderItem = function (ul, item) {
      return $('<li>')
        .addClass('autocomplete-item ui-menu-item')
        .attr('data-value', item.value)
        .append(`
        <div class="autocomplete-item-content">
          <span class="autocomplete-item-name">
            <i class="fas fa-terminal text-xs opacity-70"></i>
            ${item.value}
          </span>
          <span class="autocomplete-item-description">${item.description}</span>
          <div class="autocomplete-shortcut">
            Press <kbd>Tab</kbd> to complete, <kbd>Enter</kbd> to execute
          </div>
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
    this.activateAutoComplete()
  }

  /**
   * Displays a new console message with optimized rendering.
   * @param {Object} options - The message configuration object
   * @param {string} options.message - The message content to display
   * @param {string} [options.type='success'] - The message type (success, error, etc.)
   * @param {boolean} [options.withStatus=true] - Whether to show status icon
   * @param {boolean} [options.time=true] - Whether to show timestamp
   * @param {boolean} [options.isPacket=false] - Whether this is a packet message
   * @param {boolean} [options.isIncoming=false] - For packets, whether it's incoming or outgoing
   * @param {Object} [options.details=null] - Additional details for expandable content
   * @public
   */
  consoleMessage ({ message, type = 'success', withStatus = true, time = true, isPacket = false, isIncoming = false, details = null } = {}) {
    if (!message) return

    const baseTypeClasses = {
      success: 'bg-highlight-green/10 border-l-4 border-highlight-green text-highlight-green',
      error: 'bg-error-red/10 border-l-4 border-error-red text-error-red',
      wait: 'bg-tertiary-bg/30 border-l-4 border-tertiary-bg text-gray-300',
      celebrate: 'bg-purple-500/10 border-l-4 border-purple-500 text-purple-400',
      warn: 'bg-highlight-yellow/10 border-l-4 border-highlight-yellow text-highlight-yellow',
      notify: 'bg-blue-500/10 border-l-4 border-blue-500 text-blue-400',
      speech: 'bg-primary-bg/10 border-l-4 border-primary-bg text-text-primary',
      logger: 'bg-gray-700/30 border-l-4 border-gray-600 text-gray-300',
      action: 'bg-teal-500/10 border-l-4 border-teal-500 text-teal-400'
    }

    const packetTypeClasses = {
      incoming: 'bg-tertiary-bg/20 border-l-4 border-highlight-green text-text-primary',
      outgoing: 'bg-highlight-green/5 border-l-4 border-highlight-yellow text-text-primary'
    }

    const createElement = (tag, classes = '', content = '') => {
      return $('<' + tag + '>').addClass(classes + ' message-animate-in').html(content)
    }

    const getTime = () => {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      return `${hours}:${minutes}:${seconds}`
    }

    const status = (type, message) => {
      const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        wait: 'fa-spinner fa-pulse',
        celebrate: 'fa-trophy',
        warn: 'fa-exclamation-triangle',
        notify: 'fa-info-circle',
        speech: 'fa-comment-alt',
        logger: 'fa-file-alt',
        action: 'fa-bolt'
      }

      return `<div class="flex items-center space-x-2 w-full">
        <div class="flex">
          <i class="fas ${icons[type] || 'fa-circle'} mr-2"></i>
        </div>
        <span>${message}</span>
      </div>`
    }

    const $container = createElement(
      'div',
      'flex items-start p-3 rounded-md mb-2 shadow-sm max-w-full w-full transition-colors duration-150 hover:bg-opacity-20'
    )

    if (isPacket) {
      $container.addClass(packetTypeClasses[isIncoming ? 'incoming' : 'outgoing'])
    } else {
      $container.addClass(baseTypeClasses[type] || 'bg-tertiary-bg/10 border-l-4 border-tertiary-bg text-text-primary')
    }

    if (isPacket) {
      const iconClass = isIncoming ? 'fa-arrow-down text-highlight-green' : 'fa-arrow-up text-highlight-yellow'
      const $iconContainer = createElement('div', 'flex items-center mr-3 text-base', `<i class="fas ${iconClass}"></i>`)
      $container.append($iconContainer)
    } else if (time) {
      const $timeContainer = createElement('div', 'text-xs text-gray-500 mr-3 whitespace-nowrap font-mono', getTime())
      $container.append($timeContainer)
    }

    const $messageContainer = createElement(
      'div',
      isPacket
        ? 'text-xs flex-1 break-all leading-relaxed'
        : 'flex-1 text-xs flex items-center space-x-2 leading-relaxed'
    )

    if (withStatus && !isPacket) {
      $messageContainer.html(status(type, message))
    } else {
      $messageContainer.text(message)
      if (isPacket) {
        $messageContainer.addClass('font-mono')
      }
    }

    $messageContainer.addClass('overflow-hidden text-ellipsis whitespace-normal break-words')
    $container.append($messageContainer)

    if (isPacket && details) {
      const $actionsContainer = createElement('div', 'flex ml-2 items-center')

      const $detailsButton = createElement(
        'button',
        'text-xs text-gray-400 hover:text-text-primary transition-colors px-2 py-1 rounded hover:bg-tertiary-bg/20',
        '<i class="fas fa-code mr-1"></i> Details'
      )

      const $copyButton = createElement(
        'button',
        'text-xs text-gray-400 hover:text-text-primary transition-colors px-2 py-1 rounded hover:bg-tertiary-bg/20 ml-1',
        '<i class="fas fa-copy mr-1"></i> Copy'
      )

      $copyButton.on('click', (e) => {
        e.stopPropagation()
        const originalHtml = $copyButton.html()

        navigator.clipboard.writeText(message).then(() => {
          $copyButton.html('<i class="fas fa-check mr-1"></i> Copied!')
          $copyButton.addClass('text-highlight-green')

          setTimeout(() => {
            $copyButton.html(originalHtml)
            $copyButton.removeClass('text-highlight-green')
          }, 1500)
        })
      })

      $actionsContainer.append($detailsButton, $copyButton)
      $container.append($actionsContainer)

      const $detailsContainer = createElement(
        'div',
        'bg-tertiary-bg/50 rounded-md p-3 mt-2 hidden w-full',
        `<pre class="text-xs text-text-primary overflow-auto max-h-[300px] font-mono">${JSON.stringify(details, null, 2)}</pre>`
      )

      $detailsButton.on('click', (e) => {
        e.stopPropagation()
        $detailsContainer.toggleClass('hidden')
        const isHidden = $detailsContainer.hasClass('hidden')
        $detailsButton.html(
          isHidden
            ? '<i class="fas fa-code mr-1"></i> Details'
            : '<i class="fas fa-chevron-up mr-1"></i> Hide'
        )
      })

      $container.after($detailsContainer)

      $container.css('cursor', 'pointer')
      $container.on('click', function (e) {
        if (!$(e.target).closest('button').length) {
          $detailsButton.click()
        }
      })
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
      const messageLogEl = $messageLog[0]
      const isAtBottom = messageLogEl.scrollHeight - messageLogEl.scrollTop - $messageLog.innerHeight() <= 30

      if (isAtBottom) {
        requestAnimationFrame(() => {
          messageLogEl.scrollTop = messageLogEl.scrollHeight
        })
      }
    } else {
      $('#messages').append($container)

      const $messages = $('#messages')
      const messagesEl = $messages[0]

      requestAnimationFrame(() => {
        messagesEl.scrollTop = messagesEl.scrollHeight
      })
    }

    if (window.applyFilter) {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => window.applyFilter())
      } else {
        setTimeout(() => window.applyFilter(), 0)
      }
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
   * Renders a plugin item in the sidebar.
   * @param {Object} plugin - The plugin configuration object
   * @returns {JQuery<HTMLElement>} - The rendered plugin element
   */
  renderPluginItems ({ name, type, description, author = 'Sxip' } = {}) {
    const getIconClass = () => {
      switch (type) {
        case 'ui': return 'fa-desktop'
        case 'game': return 'fa-gamepad'
        default: return 'fa-plug'
      }
    }

    const getIconColorClass = () => {
      switch (type) {
        case 'ui': return 'text-highlight-green bg-highlight-green/10'
        case 'game': return 'text-highlight-yellow bg-highlight-yellow/10'
        default: return 'text-blue-400 bg-blue-400/10'
      }
    }

    const onClickEvent = type === 'ui' ? () => jam.application.dispatch.open(name) : null

    const $listItem = $('<li>', {
      class: `plugin-item ${type === 'ui' ? 'group' : ''}`,
      'data-plugin-name': name.toLowerCase(),
      'data-plugin-type': type
    })

    const $container = $('<div>', {
      class: `flex items-center px-3 py-3.5 ${type === 'ui' ? 'hover:bg-tertiary-bg/70 cursor-pointer' : ''} rounded-md transition-colors duration-150`,
      click: onClickEvent
    })

    const $iconContainer = $('<div>', {
      class: `w-8 h-8 flex items-center justify-center ${getIconColorClass()} rounded-md mr-3 flex-shrink-0 transition-transform group-hover:scale-110`
    }).append($('<i>', { class: `fas ${getIconClass()} text-base` }))

    const $contentContainer = $('<div>', { class: 'flex-1 min-w-0' })

    const $titleRow = $('<div>', { class: 'flex items-center justify-between' })

    $titleRow.append($('<span>', {
      class: 'text-sidebar-text font-medium truncate text-[15px] group-hover:text-text-primary transition-colors',
      text: name
    }))

    const $metaRow = $('<div>', {
      class: 'flex items-center text-[11px] text-gray-400 mt-1'
    })

    $metaRow.append($('<span>', {
      class: 'flex items-center',
      html: `<i class="fas fa-user mr-1 opacity-70"></i>${author}`
    }))

    $metaRow.append($('<span>', {
      class: 'mx-1.5 opacity-50',
      html: '•'
    }))

    $metaRow.append($('<span>', {
      class: 'opacity-70',
      text: type.charAt(0).toUpperCase() + type.slice(1)
    }))

    const $description = $('<p>', {
      class: 'text-xs text-gray-400 break-words mt-1.5 pr-1',
      text: description || `${type.charAt(0).toUpperCase() + type.slice(1)} plugin for Animal Jam`,
      title: description
    })

    if (type === 'game') {
      const $actionButton = $('<button>', {
        class: 'ml-2 text-gray-400 hover:text-text-primary p-1 rounded-full hover:bg-tertiary-bg/50 transition-colors opacity-0 group-hover:opacity-100',
        html: '<i class="fas fa-ellipsis-v text-xs"></i>',
        title: 'Plugin options'
      })

      $actionButton.on('click', (e) => {
        e.stopPropagation()
      })

      $iconContainer.after($actionButton)
    }

    $contentContainer.append($titleRow, $metaRow, $description)
    $container.append($iconContainer, $contentContainer)
    $listItem.append($container)

    $listItem.css({
      opacity: 0,
      transform: 'translateX(-10px)'
    })

    if (type === 'ui') this.$pluginList.prepend($listItem)
    else this.$pluginList.append($listItem)

    setTimeout(() => {
      $listItem.css({
        transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
        opacity: 1,
        transform: 'translateX(0)'
      })
    }, 50)

    return $listItem
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

    const secureConnection = this.settings.get('secureConnection')
    if (secureConnection) await this._checkForHostChanges()

    await this.server.serve()
    this.emit('ready')
  }
}

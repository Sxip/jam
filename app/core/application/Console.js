/**
 * Default message properties
 */
const defaultMessageProps = {
  time: true
}

/**
 * Message status icons
 */
const messageStatus = {
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
}

class Console {
  constructor () {
    this.input = document.getElementById('input')

    this.input.addEventListener('keydown', e => {
      const keyCode = e.which

      if (keyCode === 13) {
        this.handleInput(this.input.value)
        this.input.value = ''
      }
    })
  }

  /**
   * Gets the time
   */
  getTime () {
    const time = new Date()
    const hour = time.getHours()
    const minute = time.getMinutes()
    const timeString = `${hour}:${minute}`

    return timeString
  }

  /**
   * Handles the message html
   */
  messageHTML (messageData) {
    const container = document.createElement('div')
    const time = document.createElement('div')
    const message = document.createElement('div')

    container.className = `message ${messageData.type || ''}`

    // Time
    if (messageData.time) {
      time.className = 'time'
      time.textContent = `${this.getTime()} `
      container.appendChild(time)
    }

    // Message
    if (messageData.withStatus) message.innerHTML = this.status(messageData.type, messageData.message)
    else message.innerHTML = messageData.message

    message.className = 'message-content'

    container.append(message)
    return container
  }

  /**
   * Shows the message
   */
  showMessage (messageData) {
    const messageElement = this.messageHTML({ ...defaultMessageProps, ...messageData })

    document.getElementById('messages').appendChild(messageElement)
    this.scrollToBottom(messageElement.offsetHeight)
  }

  /**
   *  Message status
   */
  status (type, message) {
    const status = messageStatus[type]
    if (!status) throw new Error('Invalid Status Type.')

    return `${status.icon} ${message || ''}`
  }

  /**
   * Clears the console
   */
  clear () {
    const div = document.getElementById('messages')

    while (div.firstChild) div.removeChild(div.firstChild)
  }

  /**
   * Handles commands
   */
  handleInput (message) {
    const parameters = message.split(' ')
    const command = parameters.shift()

    const cmd = core.pluginManager.commands.commands.get(command)
    if (cmd) cmd.execute({ parameters })
  }

  /**
   * Scrolls to the bottom
   */
  scrollToBottom (elHeight) {
    const messageContainer = document.getElementById('messages')
    const totalScroll = messageContainer.scrollHeight - messageContainer.offsetHeight
    const currentScroll = messageContainer.scrollTop

    if (totalScroll - currentScroll <= elHeight) messageContainer.scrollTop = totalScroll
  }
}

module.exports = Console

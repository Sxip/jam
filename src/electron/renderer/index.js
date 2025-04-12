const Application = require('./application')
const { ipcRenderer } = require('electron')

const application = new Application()

/**
 * Initialize the application with better error handling and performance tracking
 */
const initializeApp = async () => {
  application.consoleMessage({
    message: 'Starting Jam...',
    type: 'wait'
  })

  try {
    await application.instantiate()

    application.attachNetworkingEvents()

    ipcRenderer.send('check-for-updates')
  } catch (error) {
    application.consoleMessage({
      message: `Error during initialization: ${error.message}`,
      type: 'error'
    })

    console.error('Initialization error details:', error)

    application.consoleMessage({
      message: 'Attempting to continue with limited functionality...',
      type: 'warn'
    })
  }
}

/**
 * Set up IPC communication events between renderer and main process
 */
const setupIpcEvents = () => {
  ipcRenderer
    .on('message', (sender, args) => application.consoleMessage({ ...args }))
    .on('update-available', () => {
      application.consoleMessage({
        message: 'An update is available! You\'ll be notified when it\'s ready to install.',
        type: 'notify'
      })
    })
    .on('update-downloaded', () => {
      application.consoleMessage({
        message: 'Update downloaded! Restart the application to apply the update.',
        type: 'celebrate'
      })
    })
    .on('update-error', (sender, error) => {
      application.consoleMessage({
        message: `Update error: ${error}`,
        type: 'error'
      })
    })
}

/**
 * Monitor and update connection status with more professional styling
 */
const updateConnectionStatus = (isConnected) => {
  const $statusIndicator = $('#connection-status')
  const $statusDot = $statusIndicator.find('span:first-child')
  const $statusText = $statusIndicator.find('span:last-child')

  if (isConnected) {
    $statusIndicator
      .removeClass('text-gray-400')
      .addClass('text-highlight-green')
    $statusDot
      .removeClass('bg-error-red pulse-animation')
      .addClass('bg-highlight-green pulse-green')
    $statusText.text('Connected')
  } else {
    $statusIndicator
      .removeClass('text-highlight-green')
      .addClass('text-gray-400')
    $statusDot
      .removeClass('bg-highlight-green pulse-green')
      .addClass('bg-error-red pulse-animation')
    $statusText.text('Disconnected')
  }
}

const updateTimestamp = () => {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  $('#timestamp-display').text(`${hours}:${minutes}:${seconds}`)
}

/**
 * Set up application event listeners for component communication
 */
const setupAppEvents = () => {
  application
    .on('ready', () => {
      application.activateAutoComplete()

      setTimeout(() => {
        application.consoleMessage({
          message: 'Welcome to Jam! Type a command or use the sidebar to get started.',
          type: 'notify'
        })
      }, 500)

      setInterval(updateTimestamp, 1000)
      updateTimestamp()
    })
    .on('refresh:plugins', () => {
      application.refreshAutoComplete()
      application.attachNetworkingEvents()
    })
    .on('connection:change', (isConnected) => {
      updateConnectionStatus(isConnected)
    })
}

console.log = (message) => {
  const formattedMessage = typeof message === 'object'
    ? JSON.stringify(message, null, 2)
    : message

  application.consoleMessage({
    message: formattedMessage,
    type: 'logger'
  })
}

initializeApp()
setupIpcEvents()
setupAppEvents()

window.jam = {
  application,
  dispatch: application.dispatch,
  settings: application.settings,
  server: application.server
}

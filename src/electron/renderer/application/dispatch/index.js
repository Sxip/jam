const path = require('path')
const { PluginManager: PM } = require('live-plugin-manager')
const fs = require('fs').promises
const Ajv = new (require('ajv'))({ useDefaults: true })
const { ConnectionMessageTypes, PluginTypes } = require('../../../../Constants')

/**
 * The path to the plugins folder
 * @constant
 */
const BASE_PATH = process.platform === 'win32'
  ? path.resolve('plugins/')
  : process.platform === 'darwin'
    ? path.join(__dirname, '..', '..', '..', '..', '..', '..', '..', 'plugins/')
    : undefined

/**
 * The default Configuration schema
 * @type {Object}
 * @private
 */
const ConfigurationSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    main: { type: 'string', default: 'index.js' },
    description: { type: 'string', default: '' },
    author: { type: 'string', default: 'Sxip' },
    type: { type: 'string', default: 'game' },
    dependencies: { type: 'object', default: {} }
  },
  required: [
    'name',
    'main',
    'description',
    'author',
    'type',
    'dependencies'
  ]
}

module.exports = class Dispatch {
  /**
   * Constructor
   * @param {Application} application
   * @constructor
   */
  constructor (application) {
    this._application = application

    /**
     * Stores all of the plugins
     * @type {Map<string, any>}
     * @public
     */
    this.plugins = new Map()

    /**
     * Dependency manager plugin manager
     * @type {PluginManager}
     * @public
     */
    this.dependencyManager = new PM(process.platform === 'darwin'
      ? { pluginsPath: path.join(__dirname, '..', '..', '..', '..', '..', '..', '..', 'plugin_packages') }
      : {}
    )

    /**
     * Stores all of the commands
     * @type {Map<string, object>}
     * @public
     */
    this.commands = new Map()

    /**
     * Intervals set
     * @type {Set<Interval>}
     * @public
     */
    this.intervals = new Set()

    /**
     * State object
     * @type {Object}
     * @public
     */
    this.state = {}

    /**
     * Stores the message hooks
     * @type {Object}
     * @public
     */
    this.hooks = {
      connection: new Map(),
      aj: new Map(),
      any: new Map()
    }

    /**
     * Debug mode flag
     * @type {boolean}
     * @private
     */
    this._debugMode = false
  }

  get connected () {
    return this._application.server.clients.size > 0
  }

  get settings () {
    return this._application.settings
  }

  /**
   * Reads files recursively from a directory
   * @param {string} directory
   * @returns {string[]}
   * @static
   */
  static async readdirRecursive (directory) {
    const result = []

    const read = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      const promises = entries.map(async (entry) => {
        const filepath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          await read(filepath)
        } else {
          result.push(filepath)
        }
      })

      await Promise.all(promises)
    }

    await read(directory)
    return result
  }

  /**
   * Opens the plugin window
   * @param name
   * @public
   */
  open (name) {
    const plugin = this.plugins.get(name)

    if (plugin) {
      const { filepath, configuration: { main } } = plugin
      const url = `file://${path.join(filepath, main)}`

      const popup = window.open(url)

      if (popup) {
        popup.jam = {
          application: this._application,
          dispatch: this
        }
      }
    } else {
      this._application.consoleMessage({
        type: 'error',
        message: `Plugin "${name}" not found.`
      })
    }
  }

  /**
   * Installs plugin dependencies
   * @param {object} configuration
   * @public
   */
  async installDependencies (configuration) {
    const { dependencies } = configuration

    if (!dependencies || Object.keys(dependencies).length === 0) {
      return
    }

    const installPromises = Object.entries(dependencies).map(
      ([module, version]) => this.dependencyManager.install(module, version)
    )

    await Promise.all(installPromises)
  }

  /**
   * Requires a plugin dependency
   * @param {string} name
   */
  require (name) {
    return this.dependencyManager.require(name)
  }

  /**
   * Helper function to wait for the jquery preload to finish
   * @param {Window} window
   * @param {Function} callback
   * @public
   */
  waitForJQuery (window, callback) {
    return new Promise((resolve, reject) => {
      const checkInterval = 100
      const maxRetries = 100
      let retries = 0

      const intervalId = setInterval(() => {
        if (typeof window.$ !== 'undefined') {
          clearInterval(intervalId)
          try {
            callback()
            resolve()
          } catch (error) {
            reject(error)
          }
        } else if (retries >= maxRetries) {
          clearInterval(intervalId)
          reject(new Error('jQuery was not found within the expected time.'))
        } else {
          retries++
        }
      }, checkInterval)
    })
  }

  /**
   * Loads all of the plugins
   * @returns {Promise<void>}
   * @public
   */
  async load (filter = file => path.basename(file) === 'plugin.json') {
    try {
      this._application.consoleMessage({
        message: 'Loading plugins...',
        type: 'wait'
      })

      const filepaths = await this.constructor.readdirRecursive(BASE_PATH)
      const validPaths = filepaths.filter(filter)

      if (validPaths.length === 0) {
        this._application.consoleMessage({
          message: 'No plugins found in the plugins directory.',
          type: 'notify'
        })
        return
      }

      const results = await Promise.allSettled(validPaths.map(async filepath => {
        try {
          const configuration = require(filepath)
          await this._storeAndValidate(path.dirname(filepath), configuration.default || configuration)
          return { success: true, path: filepath }
        } catch (error) {
          return {
            success: false,
            path: filepath,
            error: error.message
          }
        }
      }))

      const successful = results.filter(r => r.status === 'fulfilled' && r.value?.success).length
      const failed = results.filter(r => r.status === 'fulfilled' && !r.value?.success).length
      const errors = results
        .filter(r => r.status === 'fulfilled' && !r.value?.success)
        .map(r => r.value)

      if (failed > 0) {
        this._application.consoleMessage({
          message: `${successful} plugins loaded successfully, ${failed} plugins failed to load.`,
          type: failed > 0 ? 'warn' : 'success'
        })

        errors.forEach(({ path: pluginPath, error }) => {
          this._application.consoleMessage({
            message: `Failed to load plugin at ${path.relative(BASE_PATH, pluginPath)}: ${error}`,
            type: 'error'
          })
        })
      } else {
        this._application.consoleMessage({
          message: `Successfully loaded ${successful} plugins.`,
          type: 'success'
        })
      }
    } catch (error) {
      this._application.consoleMessage({
        type: 'error',
        message: `Error loading plugins: ${error.message}`
      })
    }
  }

  /**
   * Dispatches all of the message hooks
   * @param {Object} options - The message context
   * @param {Object} options.client - The client sending the message
   * @param {string} options.type - The message type
   * @param {Object} options.message - The message object
   * @returns {Promise<void>}
   * @public
   */
  async all ({ client, type, message }) {
    const messageType = message.type
    const hasAjHooks = type === ConnectionMessageTypes.aj && this.hooks.aj.has(messageType)
    const hasConnectionHooks = type === ConnectionMessageTypes.connection && this.hooks.connection.has(messageType)
    const hasAnyHooks = this.hooks.any.has(ConnectionMessageTypes.any)

    if (!hasAjHooks && !hasConnectionHooks && !hasAnyHooks) {
      return
    }

    const hooks = [
      ...(hasAjHooks ? this.hooks.aj.get(messageType) : []),
      ...(hasConnectionHooks ? this.hooks.connection.get(messageType) : []),
      ...(hasAnyHooks ? this.hooks.any.get(ConnectionMessageTypes.any) : [])
    ]

    if (hooks.length === 0) return

    const context = { client, type, dispatch: this, message }

    try {
      const results = await Promise.allSettled(hooks.map(hook => hook(context)))

      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => result.reason)

      if (errors.length > 0) {
        errors.forEach(error => {
          this._application.consoleMessage({
            type: 'error',
            message: `Failed hooking packet ${messageType}: ${error.message}`
          })
        })
      }
    } catch (error) {
      this._application.consoleMessage({
        type: 'error',
        message: `Unexpected error dispatching hooks for ${messageType}: ${error.message}`
      })
    }
  }

  /**
   * Sends multiple messages
   * @param messages
   * @public
   */
  async sendMultipleMessages ({ type, messages = [] } = {}) {
    if (messages.length === 0) {
      return Promise.resolve()
    }

    const sendFunction = type === ConnectionMessageTypes.aj
      ? this.sendRemoteMessage.bind(this)
      : this.sendConnectionMessage.bind(this)

    try {
      await Promise.all(messages.map(sendFunction))
    } catch (error) {
      this._application.consoleMessage({
        type: 'error',
        message: `Error sending messages: ${error.message}`
      })
    }
  }

  /**
   * Stores and validates the plugin configuration
   * @param filepath
   * @param configuration
   * @private
   */
  async _storeAndValidate (filepath, configuration) {
    const validate = Ajv.compile(ConfigurationSchema)

    if (!validate(configuration)) {
      this._application.consoleMessage({
        type: 'error',
        message: `Failed validating the configuration for the plugin ${filepath}. ${validate.errors[0].message}.`
      })
      return
    }

    if (this.plugins.has(configuration.name)) {
      this._application.consoleMessage({
        type: 'error',
        message: `Plugin with the name ${configuration.name} already exists.`
      })
      return
    }

    try {
      await this.installDependencies(configuration)

      switch (configuration.type) {
        case PluginTypes.game: {
          const PluginInstance = require(path.join(filepath, configuration.main))
          const plugin = new PluginInstance({
            application: this._application,
            dispatch: this
          })

          this.plugins.set(configuration.name, {
            configuration,
            filepath,
            plugin
          })
          break
        }

        case PluginTypes.ui:
          this.plugins.set(configuration.name, { configuration, filepath })
          break

        default:
          throw new Error(`Unsupported plugin type: ${configuration.type}`)
      }

      this._application.renderPluginItems(configuration)
    } catch (error) {
      this._application.consoleMessage({
        type: 'error',
        message: `Error processing the plugin ${filepath}: ${error.message}`
      })
    }
  }

  /**
   * Refreshes a plugin
   * @param {string} The plugin name
   * @returns {Promise<void>}
   */
  async refresh () {
    const { $pluginList, consoleMessage } = this._application

    $pluginList.empty()

    const pluginPaths = [...this.plugins.values()].map(({ filepath, configuration: { main } }) => ({
      jsPath: path.resolve(filepath, main),
      jsonPath: path.resolve(filepath, 'plugin.json')
    }))

    for (const { jsPath, jsonPath } of pluginPaths) {
      const jsCacheKey = require.resolve(jsPath)
      const jsonCacheKey = require.resolve(jsonPath)
      if (require.cache[jsCacheKey]) delete require.cache[jsCacheKey]
      if (require.cache[jsonCacheKey]) delete require.cache[jsonCacheKey]
    }

    this.clearAll()
    await this.load()

    this._application.emit('refresh:plugins')
    consoleMessage({
      type: 'success',
      message: 'Successfully refreshed plugins.'
    })
  }

  /**
   * Promise timeout helper
   * @param ms
   * @returns {Promise<void>}
   * @public
   */
  wait (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Displays a server admin message
   * @param {string} text
   * @public
   */
  serverMessage (text) {
    return this.sendConnectionMessage(`%xt%ua%${text}%0%`)
  }

  /**
   * Helper method for random
   * @param {number} min
   * @param {number} max
   * @public
   */
  random (min, max) {
    return ~~(Math.random() * (max - min + 1)) + min
  }

  /**
   * Sets a state
   * @param {string} key
   * @param {any} value
   * @returns {this}
   * @public
   */
  setState (key, value) {
    this.state[key] = value
    return this
  }

  /**
   * Fetches the state
   * @param key
   * @param defaultValue
   * @returns {any}
   * @public
   */
  getState (key, defaultValue = null) {
    if (this.state[key]) return this.state[key]
    return defaultValue
  }

  /**
   * Updates a state
   * @param {string} key
   * @param {any} value
   * @returns {this}
   * @public
   */
  updateState (key, value) {
    if (this.state[key]) this.state[key] = value
    else throw new Error('Invalid state key.')
    return this
  }

  /**
   * Sends a connection message with retry capability
   * @param {string} message - The message to send
   * @param {Object} options - Send options
   * @param {number} [options.retries=0] - Number of retries on failure
   * @param {number} [options.retryDelay=100] - Delay between retries in ms
   * @returns {Promise<number[]>} - Results from sending
   * @public
   */
  async sendConnectionMessage (message, options = {}) {
    return this._sendWithRetry(message, ConnectionMessageTypes.connection, options)
  }

  /**
   * Sends a remote message with retry capability
   * @param {string} message - The message to send
   * @param {Object} options - Send options
   * @param {number} [options.retries=0] - Number of retries on failure
   * @param {number} [options.retryDelay=100] - Delay between retries in ms
   * @returns {Promise<number[]>} - Results from sending
   * @public
   */
  async sendRemoteMessage (message, options = {}) {
    return this._sendWithRetry(message, ConnectionMessageTypes.aj, options)
  }

  /**
   * Internal method to handle sending messages with retry logic
   * @param {string} message - The message to send
   * @param {string} type - Message type (aj or connection)
   * @param {Object} options - Send options
   * @returns {Promise<number[]>} - Results from sending
   * @private
   */
  async _sendWithRetry (message, type, { retries = 0, retryDelay = 100 } = {}) {
    const clients = [...this._application.server.clients]

    if (clients.length === 0) {
      return []
    }

    const sendMethod = type === ConnectionMessageTypes.aj
      ? client => client.sendRemoteMessage(message)
      : client => client.sendConnectionMessage(message)

    let attempt = 0
    let lastError

    do {
      try {
        if (attempt > 0) {
          await this.wait(retryDelay)

          if (this._debugMode) {
            this._debugLog(`Retry attempt ${attempt} for sending ${type} message`, 'warn')
          }
        }

        const results = await Promise.all(clients.map(sendMethod))
        return results
      } catch (error) {
        lastError = error
        attempt++
      }
    } while (attempt <= retries)

    this._application.consoleMessage({
      type: 'error',
      message: `Failed to send message after ${retries + 1} attempts: ${lastError?.message || 'Unknown error'}`
    })

    throw lastError || new Error('Failed to send message')
  }

  /**
   * Sets an interval
   * @param {Function} fn - The function to call at intervals
   * @param {number} delay - The delay in milliseconds
   * @param  {...any} args - Additional arguments to pass to the function
   * @returns {number} - The interval ID
   * @public
   */
  setInterval (fn, delay, ...args) {
    if (typeof fn !== 'function') {
      this._application.consoleMessage({
        type: 'error',
        message: 'Invalid interval function provided'
      })
      return null
    }

    try {
      const interval = setInterval(fn, delay, ...args)
      this.intervals.add(interval)
      return interval
    } catch (error) {
      this._application.consoleMessage({
        type: 'error',
        message: `Failed to set interval: ${error.message}`
      })
      return null
    }
  }

  /**
   * Clears an interval
   * @param {number} interval - The interval ID to clear
   * @public
   */
  clearInterval (interval) {
    if (!interval) return

    try {
      clearInterval(interval)
      this.intervals.delete(interval)
    } catch (error) {
      this._application.consoleMessage({
        type: 'error',
        message: `Failed to clear interval: ${error.message}`
      })
    }
  }

  /**
   * Clears all registered intervals
   * @returns {void}
   * @public
   */
  clearAllIntervals () {
    try {
      for (const interval of this.intervals) {
        clearInterval(interval)
      }
      this.intervals.clear()
    } catch (error) {
      this._application.consoleMessage({
        type: 'error',
        message: `Failed to clear all intervals: ${error.message}`
      })
    }
  }

  /**
   * Hooks a command
   * @param command
   * @public
   */
  onCommand ({ name, description = '', callback, pluginName = null } = {}) {
    if (typeof name !== 'string' || typeof callback !== 'function') return

    if (this.commands.has(name)) return
    this.commands.set(name, { name, description, callback })

    if (pluginName) {
      this._trackPluginReference(pluginName, 'command', name, callback)
    }
  }

  /**
   * Off command, removes the command
   * @param command
   * @public
   */
  offCommand ({ name, callback } = {}) {
    if (!this.commands.has(name)) return

    const commandCallbacks = this.commands.get(name)

    const index = commandCallbacks.indexOf(callback)
    if (index !== -1) commandCallbacks.splice(index, 1)
  }

  /**
   * Hooks a message by the type
   * @param options
   * @public
   */
  onMessage ({ type, message, callback, pluginName = null } = {}) {
    const registrationMap = {
      [ConnectionMessageTypes.aj]: this._registerAjHook.bind(this),
      [ConnectionMessageTypes.connection]: this._registerConnectionHook.bind(this),
      [ConnectionMessageTypes.any]: this._registerAnyHook.bind(this)
    }

    const registerHook = registrationMap[type]
    if (registerHook) {
      registerHook({ type, message, callback })

      if (pluginName) {
        this._trackPluginReference(pluginName, type, message, callback)
      }
    }
  }

  /**
   * Unhooks a message
   * @param options
   * @public
   */
  offMessage ({ type, callback } = {}) {
    const hooksMap = {
      [ConnectionMessageTypes.aj]: this.hooks.aj,
      [ConnectionMessageTypes.connection]: this.hooks.connection,
      [ConnectionMessageTypes.any]: this.hooks.any
    }

    const hooks = hooksMap[type]

    if (hooks) {
      const hookList = hooks.get(type)
      if (hookList) {
        const index = hookList.indexOf(callback)
        if (index !== -1) {
          hookList.splice(index, 1)
        }
      }
    }
  }

  /**
   * Registers a message hook for the specified type
   * @param {string} type - The type of hook to register
   * @param {object} hook - The hook object containing message and callback
   * @private
   */
  _registerHook (type, { message, callback }) {
    if (!this.hooks[type]) {
      return this._application.consoleMessage({
        type: 'error',
        message: `Invalid hook type: ${type}`
      })
    }

    const hooksMap = this.hooks[type]
    if (hooksMap.has(message)) {
      hooksMap.get(message).push(callback)
    } else {
      hooksMap.set(message, [callback])
    }
  }

  /**
   * Registers a local message hook
   * @param {object} hook - The hook object
   * @private
   */
  _registerConnectionHook (hook) {
    this._registerHook('connection', hook)
  }

  /**
   * Registers a remote message hook
   * @param {object} hook - The hook object
   * @private
   */
  _registerAjHook (hook) {
    this._registerHook('aj', hook)
  }

  /**
   * Registers any message hook
   * @param {object} hook - The hook object
   * @private
   */
  _registerAnyHook (hook) {
    this._registerHook('any', { message: ConnectionMessageTypes.any, callback: hook.callback })
  }

  /**
   * Safely unloads a specific plugin by name
   * @param {string} pluginName - The name of the plugin to unload
   * @returns {boolean} - Whether the plugin was successfully unloaded
   * @public
   */
  async unloadPlugin (pluginName) {
    if (!this.plugins.has(pluginName)) {
      this._application.consoleMessage({
        type: 'error',
        message: `Plugin "${pluginName}" not found.`
      })
      return false
    }

    try {
      const pluginInfo = this.plugins.get(pluginName)

      for (const [type, hooks] of Object.entries(this.hooks)) {
        for (const [messageType, callbacksList] of hooks.entries()) {
          // For now I have to remove all - this is a limitation
          // In the future I will have to remove only the ones that belong to the plugin
        }
      }

      if (pluginInfo.plugin && typeof pluginInfo.plugin.dispose === 'function') {
        await pluginInfo.plugin.dispose()
      }

      this.plugins.delete(pluginName)
      this._application.consoleMessage({
        type: 'success',
        message: `Plugin "${pluginName}" has been unloaded.`
      })

      return true
    } catch (error) {
      this._application.consoleMessage({
        type: 'error',
        message: `Error unloading plugin "${pluginName}": ${error.message}`
      })
      return false
    }
  }

  /**
   * Load a single plugin by path
   * @param {string} filepath - Path to the plugin.json file
   * @returns {Promise<boolean>} - Whether the plugin was loaded successfully
   * @public
   */
  async loadSinglePlugin (filepath) {
    try {
      if (!filepath.endsWith('plugin.json')) {
        throw new Error('Invalid plugin path: must point to a plugin.json file')
      }

      const fullPath = path.resolve(filepath)
      if (require.cache[fullPath]) {
        delete require.cache[fullPath]
      }

      const configuration = require(fullPath)
      const dirPath = path.dirname(fullPath)

      await this._storeAndValidate(dirPath, configuration.default || configuration)

      this._application.consoleMessage({
        type: 'success',
        message: `Plugin "${configuration.name || 'unknown'}" loaded successfully.`
      })

      return true
    } catch (error) {
      this._application.consoleMessage({
        type: 'error',
        message: `Failed to load plugin at ${filepath}: ${error.message}`
      })

      return false
    }
  }

  /**
   * Handles cleanup
   * @public
   */
  clearAll () {
    const pluginsToUnload = [...this.plugins.keys()]

    pluginsToUnload.forEach(pluginName => {
      try {
        const pluginInfo = this.plugins.get(pluginName)
        if (pluginInfo.plugin && typeof pluginInfo.plugin.dispose === 'function') {
          pluginInfo.plugin.dispose()
        }
      } catch (error) {
        this._application.consoleMessage({
          type: 'error',
          message: `Error disposing plugin "${pluginName}": ${error.message}`
        })
      }
    })

    this.plugins.clear()
    this.commands.clear()

    Object.values(this.hooks).forEach(hookMap => hookMap.clear())
    this.clearAllIntervals()
  }

  /**
   * State management with transaction support
   * @param {Object} stateUpdates - Object containing key-value pairs to update
   * @returns {boolean} - Success status
   * @public
   */
  updateMultipleStates (stateUpdates) {
    if (!stateUpdates || typeof stateUpdates !== 'object') {
      return false
    }

    try {
      Object.entries(stateUpdates).forEach(([key, value]) => {
        this.state[key] = value
      })
      return true
    } catch (error) {
      this._application.consoleMessage({
        type: 'error',
        message: `Failed to update multiple states: ${error.message}`
      })
      return false
    }
  }

  /**
   * Get multiple state values at once
   * @param {string[]} keys - Array of state keys to retrieve
   * @returns {Object} - Object with requested state values
   * @public
   */
  getMultipleStates (keys) {
    if (!Array.isArray(keys)) {
      return {}
    }

    const result = {}
    keys.forEach(key => {
      result[key] = this.getState(key)
    })
    return result
  }

  /**
   * Track plugin hooks and commands
   * @param {string} pluginName - The name of the plugin
   * @param {string} hookType - Type of hook (command, message, any)
   * @param {string} hookId - Identifier for the hook
   * @param {Function} callback - The callback function
   * @private
   */
  _trackPluginReference (pluginName, hookType, hookId, callback) {
    if (!this._pluginReferences) {
      this._pluginReferences = new Map()
    }

    if (!this._pluginReferences.has(pluginName)) {
      this._pluginReferences.set(pluginName, {
        commands: new Set(),
        hooks: new Map()
      })
    }

    const pluginRefs = this._pluginReferences.get(pluginName)

    if (hookType === 'command') {
      pluginRefs.commands.add(hookId)
    } else {
      if (!pluginRefs.hooks.has(hookType)) {
        pluginRefs.hooks.set(hookType, new Set())
      }
      pluginRefs.hooks.get(hookType).add(callback)
    }
  }

  /**
   * Toggle debug mode
   * @param {boolean} enabled - Whether to enable debug mode
   * @returns {boolean} - The new state of debug mode
   * @public
   */
  setDebugMode (enabled = true) {
    this._debugMode = !!enabled
    this._application.consoleMessage({
      type: 'notify',
      message: `Dispatch debug mode ${this._debugMode ? 'enabled' : 'disabled'}`
    })
    return this._debugMode
  }

  /**
   * Log message when in debug mode
   * @param {string} message - Message to log
   * @param {string} [type='notify'] - Message type
   * @private
   */
  _debugLog (message, type = 'notify') {
    if (this._debugMode) {
      this._application.consoleMessage({
        type,
        message: `[DISPATCH DEBUG] ${message}`
      })
    }
  }

  /**
   * Btch message sending
   * @param {Object} options - Batch options
   * @param {string} options.type - Message type (aj or connection)
   * @param {Array<string>} options.messages - Array of messages to send
   * @param {Object} [options.config] - Configuration options
   * @param {number} [options.config.batchSize=10] - Number of messages to send in parallel
   * @param {number} [options.config.delayBetweenBatches=50] - Milliseconds between batches
   * @returns {Promise<Array>} - Array of send results
   * @public
   */
  async sendMessageBatch ({ type, messages = [], config = {} } = {}) {
    if (!messages.length) return []

    const { batchSize = 10, delayBetweenBatches = 50 } = config
    const results = []
    const sendFunction = type === ConnectionMessageTypes.aj
      ? this.sendRemoteMessage.bind(this)
      : this.sendConnectionMessage.bind(this)

    this._debugLog(`Sending batch of ${messages.length} messages (${type})`, 'wait')

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize)

      try {
        const batchResults = await Promise.allSettled(batch.map(sendFunction))
        results.push(...batchResults)

        if (this._debugMode) {
          const successes = batchResults.filter(r => r.status === 'fulfilled').length
          const failures = batchResults.filter(r => r.status === 'rejected').length
          if (failures > 0) {
            this._debugLog(`Batch ${i / batchSize + 1}: ${successes} succeeded, ${failures} failed`, 'warn')
          }
        }

        if (i + batchSize < messages.length && delayBetweenBatches > 0) {
          await this.wait(delayBetweenBatches)
        }
      } catch (error) {
        this._application.consoleMessage({
          type: 'error',
          message: `Error in message batch at index ${i}: ${error.message}`
        })
      }
    }

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    this._debugLog(`Batch sending complete: ${successful} succeeded, ${failed} failed`,
      failed > 0 ? 'warn' : 'success')

    return results
  }
}

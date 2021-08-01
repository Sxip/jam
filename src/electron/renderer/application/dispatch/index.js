const { rootPath } = require('electron-root-path')
const { readdir, stat } = require('fs/promises')
const path = require('path')
const Ajv = new (require('ajv'))({ useDefaults: true })
const { ConnectionMessageTypes, PluginTypes } = require('../../../../Constants')

/**
 * The path to the plugins folder.
 * @constant
 */
const BASE_PATH = path.resolve(rootPath, 'plugins/')

/**
 * The default Configuration schema.
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
    type: { type: 'string', default: 'game' }
  },
  required: [
    'name',
    'main',
    'description',
    'author',
    'type'
  ]
}

module.exports = class Dispatch {
  /**
   * Constructor.
   * @param {Application} application
   * @constructor
   */
  constructor (application) {
    this._application = application

    /**
     * Stores all of the plugins.
     * @type {Map<string, any>}
     * @public
     */
    this.plugins = new Map()

    /**
     * Stores all of the commands
     * @type {Map<string, object>}
     * @public
     */
    this.commands = new Map()

    /**
     * Intervals set.
     * @type {Set<Interval>}
     * @public
     */
    this.intervals = new Set()

    /**
     * State object.
     * @type {Object}
     * @public
     */
    this.state = {}

    /**
     * Stores the message hooks.
     * @type {Object}
     * @public
     */
    this.hooks = {
      commands: new Map(),
      connection: new Map(),
      aj: new Map(),
      any: new Map()
    }
  }

  get client () {
    return this._application.server.client
  }

  /**
   * Reads files recursively from a directory.
   * @param {string} directory
   * @returns {string[]}
   * @static
   */
  static async readdirRecursive (directory) {
    const result = []

    const read = async (dir) => {
      const files = await readdir(dir)

      for (const file of files) {
        const filepath = path.join(dir, file)

        if (((await stat(filepath)).isDirectory())) await read(filepath)
        else result.push(filepath)
      }
    }

    await read(directory)
    return result
  }

  /**
   * Opens the plugin window.
   * @param name
   * @public
   */
  open (name) {
    const plugin = this.plugins.get(name)

    if (plugin) {
      const { filepath, configuration: { main } } = plugin
      const popup = window.open(`${filepath}\\${main}`)

      popup.jam = {
        application: this._application,
        dispatch: this
      }
    }
  }

  /**
   * Helper function to wait for the jquery preload to finish.
   * @param {Window} window
   * @param {Function} callback
   * @public
   */
  waitForJQuery (window, callback) {
    const wait = this.setInterval(() => {
      if (typeof window.$ !== 'undefined') {
        callback()
        this.clearInterval(wait)
      }
    })
  }

  /**
   * Loads all of the plugins.
   * @returns {Promise<void>}
   * @public
   */
  async load (filter = file => path.basename(file) === 'plugin.json') {
    const filepaths = await this.constructor.readdirRecursive(BASE_PATH)

    for (let filepath of filepaths) {
      filepath = path.resolve(filepath)

      if (filter(filepath)) {
        const configuration = require(filepath)
        this._storeAndValidate(path.dirname(filepath), configuration)
      }
    }
  }

  /**
   * Dispatches all of the message hooks.
   * @returns {Promise<void>}
   * @public
   */
  async all ({ message, type }) {
    const promises = []
    let hooks

    switch (type) {
      case ConnectionMessageTypes.aj:
        hooks = this.hooks.aj.get(message.type) || []
        break

      case ConnectionMessageTypes.connection:
        hooks = this.hooks.connection.get(message.type) || []
        break
    }

    if (this.hooks.any.size > 0) hooks = this.hooks.any

    for (const execute of hooks) {
      promises.push(
        (async () => {
          try {
            execute({ type, dispatch: this, message })
          } catch (error) {
            return this._application.consoleMessage({
              type: 'error',
              message: `Failed hooking packet ${message.type}. ${error.message}`
            })
          }
        })()
      )
    }

    await Promise.all(promises)
  }

  /**
   * Stores and validates the plugin configuration.
   * @param filepath
   * @param configuration
   * @private
   */
  _storeAndValidate (filepath, configuration) {
    const validate = Ajv.compile(ConfigurationSchema)

    const valid = validate(configuration)
    if (!valid) {
      return this._application.consoleMessage({
        type: 'error',
        message: `Failed validating the configuration for the plugin ${path}. ${validate.errors[0].message}.`
      })
    }

    if (this.plugins.has(configuration.name)) {
      return this._application.consoleMessage({
        type: 'error',
        message: `Plugin with the name ${configuration.name} already exists.`
      })
    }

    switch (configuration.type) {
      case PluginTypes.game: {
        const PluginInstance = require(`${filepath}\\${configuration.main}`)

        const plugin = new PluginInstance({
          application: this._application,
          dispatch: this
        })

        this.plugins.set(configuration.name, {
          configuration,
          filepath,
          plugin
        })
      }
        break

      case PluginTypes.ui:
        this.plugins.set(configuration.name, { configuration, filepath })
        break
    }
  }

  /**
   * Promise timeout helper.
   * @param ms
   * @returns {Promise<void>}
   * @public
   */
  wait (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Displays a server admin message.
   * @param {string} text
   * @public
   */
  serverMessage (text) {
    return this.sendConnectionMessage(`%xt%ua%${text}%0%`)
  }

  /**
   * Helper method for random.
   * @param {number} min
   * @param {number} max
   * @public
   */
  random (min, max) {
    return ~~(Math.random() * (max - min + 1)) + min
  }

  /**
   * Sets a state.
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
   * Fetches the state.
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
   * Updates a state.
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
   * Sends a connection message.
   * @param message
   * @returns {Promise<number>}
   * @public
   */
  sendConnectionMessage (message) {
    return this._application.server.client.sendConnectionMessage(message)
  }

  /**
   * Sends a remote message.
   * @param message
   * @returns {Promise<number>}
   * @public
   */
  sendRemoteMessage (message) {
    return this._application.server.client.sendRemoteMessage(message)
  }

  /**
   * Sets an interval.
   * @param {*} fn
   * @param {*} delay
   * @param  {...any} args
   * @returns
   * @public
   */
  setInterval (fn, delay, ...args) {
    const interval = setInterval(fn, delay, ...args)
    this.intervals.add(interval)
    return interval
  }

  /**
   * Clears an interval.
   * @param {} interval
   * @public
   */
  clearInterval (interval) {
    clearInterval(interval)
    this.intervals.clear(interval)
  }

  /**
   * Hooks a command.
   * @param command
   * @public
   */
  onCommand ({ name, description, callback } = {}) {
    if (!this.commands.has(name)) this.commands.set(name, { name, description, callback })
  }

  /**
   * Hooks a message by the type.
   * @param options
   * @public
   */
  onMessage (options = {}) {
    switch (options.type) {
      case ConnectionMessageTypes.aj:
        this._registerAjHook(options)
        break

      case ConnectionMessageTypes.connection:
        this._registerConnectionHook(options)
        break

      case ConnectionMessageTypes.any:
        this._registerAnyHook(options)
        break
    }
  }

  /**
   * Unhooks a message.
   * @param options
   * @public
   */
  offMessage (options = {}) {
    let hook

    switch (options.type) {
      case ConnectionMessageTypes.aj:
        hook = this.hooks.aj.get(options.type)
        break

      case ConnectionMessageTypes.connection:
        hook = this.hooks.connection.get(options.type)
        break

      case ConnectionMessageTypes.any:
        hook = this.hooks.any.get(options.type)
        break
    }

    if (hook.length > 0) {
      const index = hook.indexOf(options.callback)
      if (index !== -1) hook.splice(index, 1)
    }
  }

  /**
   * Registers a local message hook.
   * @param hook
   * @private
   */
  _registerConnectionHook (hook) {
    if (this.hooks.connection.has(hook.message)) this.hooks.connection.get(hook.message).push(hook.callback)
    else this.hooks.connection.set(hook.message, [hook.callback])
  }

  /**
   * Registers a remote message hook.
   * @param hook
   * @private
   */
  _registerAjHook (hook) {
    if (this.hooks.aj.has(hook.message)) this.hooks.aj.get(hook.message).push(hook.callback)
    else this.hooks.aj.set(hook.message, [hook.callback])
  }

  /**
   * Registers any message hook.
   * @param hook
   * @private
   */
  _registerAnyHook (hook) {
    if (this.hooks.any.has(ConnectionMessageTypes.any)) this.hooks.any.get(hook.message).push(hook.callback)
    else this.hooks.any.set(ConnectionMessageTypes.any, [hook.callback])
  }
}

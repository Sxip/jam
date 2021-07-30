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
    this.hooks = { commands: new Map(), connection: new Map(), aj: new Map() }
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

      console.log('GOT', `${filepath}\\${main}`)
      window.open(`${filepath}\\${main}`)
    }
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

    const hooks = type === ConnectionMessageTypes.aj
      ? this.hooks.aj.get(message.type) || []
      : this.hooks.connection.get(message.type) || []

    for (const execute of hooks) {
      promises.push(
        (async () => {
          try {
            execute({ dispatch: this, message })
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
          client: this._application.server.client,
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
   * @public
   */
  setState (key, value) {
    this.state[key] = value
  }

  /**
   * Updates a state.
   * @param {string} key
   * @param {any} value
   * @public
   */
  updateState (key, value) {
    if (this.state[key]) this.state[key] = value
    else throw new Error('Invalid state key.')
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
    return options.type === ConnectionMessageTypes.aj
      ? this._registerAjHook(options)
      : this._registerConnectionHook(options)
  }

  /**
   * Unhooks a message.
   * @param options
   * @public
   */
  offMessage (options = {}) {
    const hook = options.type === ConnectionMessageTypes.aj
      ? this.hooks.aj.get(options.packet)
      : this.hooks.connection.get(options.packet)

    if (hook.size > 0) {
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
    if (this.hooks.connection.has(hook.message)) this.hooks.connection.get(hook.packet).push(hook.callback)
    else this.hooks.connection.set(hook.message, [hook.callback])
  }

  /**
   * Registers a remote message hook.
   * @param hook
   * @private
   */
  _registerAjHook (hook) {
    if (this.hooks.aj.has(hook.message)) this.hooks.aj.get(hook.packet).push(hook.callback)
    else this.hooks.aj.set(hook.message, [hook.callback])
  }
}

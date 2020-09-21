const { rootPath } = require('electron-root-path')
const CommandManager = require('./CommandManager')
const { deleteCache } = require('../../util')
const HookManager = require('./HookManager')
const Dispatcher = require('./Dispatcher')
const { promisify } = require('util')
const path = require('path')
const fs = require('fs')

/**
 * Game types
 */
const GAME_TYPES = [
  'jam',
  'wild',
  'feral'
]

class PluginManager {
  constructor () {
    /**
     * Stores all of the plugins
     */
    this.plugins = new Map()

    /**
     * References the command manager instance
     */
    this.commandManager = new CommandManager()

    /**
     * Dispatcher
     */
    this.dispatcher = new Dispatcher(this)

    /**
     * Hook manager
     */
    this.hookManager = new HookManager(this)

    /**
     * The path to the plugins folder
     */
    this.folder = path.resolve(rootPath, 'plugins/')
  }

  /**
   * Validates the plugin configuration
   */
  validate (config, path) {
    if (config.name === undefined || config.main === undefined || config.author === undefined || config.type === undefined || config.game === undefined) {
      core.console.showMessage({
        message: `The config for the plugin in <a href="#">${this.folder}\\${path}</a> is missing required options.`,
        withStatus: true,
        type: 'error'
      })
    }

    if (!GAME_TYPES.includes(config.game.toLowerCase())) {
      core.console.showMessage({
        message: `The config for the plugin in <a href="#">${this.folder}\\${path}</a> has a invalid game type`,
        withStatus: true,
        type: 'error'
      })
    }
  }

  /**
   * Reloads a plugin
   */
  async reload (name) {
    const plugin = this.plugins.get(name)

    if (plugin) {
      switch (plugin.config.type) {
        case 'window':
          core.console.showMessage({
            message: 'Window plugins can be reloaded using the window menu.',
            withStatus: true,
            type: 'warn'
          })
          break

        case 'game':
          await Promise.all([
            this.deleteAll(plugin),
            this.plugins.delete(name),
            deleteCache(`${this.folder}/${plugin.path}/`),
            deleteCache(`${this.folder}/${plugin.path}/plugin.json`),
            this.load(plugin.path)
          ])

          core.console.showMessage({
            message: `Successfully reloaded the plugin <a href="#">${plugin.config.name}</a>.`,
            withStatus: true,
            type: 'success'
          })
          break
      }
    }
  }

  /**
   * Deletes all of the hooks and commands within a plugin
   */
  deleteAll ({ Plugin }) {
    if (Plugin.commands.length > 0) this.commandManager.deleteCommands(Plugin)
    if (Plugin.hooks.length > 0) this.hookManager.deleteHooks(Plugin)
  }

  /**
   * Opens the plugin window
   */
  open (name) {
    const plugin = this.plugins.get(name)
    if (plugin) {
      window.open(`${this.folder}/${plugin.path}/${plugin.config.main}`)
    }
  }

  /**
   * Opens the plugin directory
   */
  directory (name) {
    const plugin = this.plugins.get(name)
    if (plugin) core.application.directory(`${this.folder}/${plugin.path}`)
  }

  /**
   * Loads all of the plugins
   */
  async loadAll () {
    const paths = await promisify(fs.readdir)(this.folder)

    for (const path of paths) {
      if (!(await promisify(fs.stat)(`${this.folder}/${path}/`)).isDirectory()) continue
      await this.load(path)
    }
  }

  /**
   * Loads the specified plugin
   */
  async load (path) {
    let config

    try {
      config = require(`${this.folder}/${path}/plugin.json`)
      this.validate(config, path)
    } catch (error) {
      core.console.showMessage({
        message: `Couldn't load the config file for the plugin in <a href="#">${this.folder}\\${path}</a>.`,
        withStatus: true,
        type: 'error'
      })
    }

    let Plugin

    if (config.main) {
      try {
        if (config.type === 'game') Plugin = require(`${this.folder}\\${path}\\${config.main}`)
        else Plugin = `${this.folder}\\${path}\\${config.main}`
      } catch (error) {
        core.console.showMessage({
          message: `Couldn't find the main file for the plugin <a href="#">${this.folder}\\${path}</a>.`,
          withStatus: true,
          type: 'error'
        })
      }
    }

    if (config.game === core.settings.get('game', 'jam')) {
      if (config.type === 'game') this.addGamePlugin({ config, path, Plugin })
      else this.addWindowPlugin({ config, path })
    }
  }

  /**
   * Adds the specified plugin to the plugins set
   */
  async addGamePlugin ({ config, path, Plugin }) {
    try {
      if (typeof Plugin === 'function') Plugin = new Plugin(core.application)
      if (typeof Plugin.initialize === 'function') Plugin.initialize()

      if (this.plugins.has(config.name)) {
        return core.console.showMessage({
          message: `A plugin with the name <a href="#">${config.name}</a> already exists.`,
          withStatus: true,
          type: 'error'
        })
      }

      this.plugins.set(config.name, {
        config,
        path,
        Plugin
      })

      if (Plugin.commands.length) this.commandManager.registerCommands(Plugin.commands)
      if (Plugin.hooks.length) this.hookManager.registerHooks(Plugin.hooks)
    } catch (error) {
      return core.console.showMessage({
        message: error,
        withStatus: true,
        type: 'error'
      })
    }
  }

  /**
   * Adds the specified window plugin to the plugins set
   */
  addWindowPlugin ({ config, path }) {
    if (this.plugins.has(config.name)) {
      return core.console.showMessage({
        message: `A plugin with the name <a href="#">${config.name}</a> already exists.`,
        withStatus: true,
        type: 'error'
      })
    }

    this.plugins.set(config.name, { config, path })
  }
}

module.exports = PluginManager

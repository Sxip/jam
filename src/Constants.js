/**
 * Connection message types.
 * @enum
 */
const ConnectionMessageTypes = Object.freeze({
  connection: 'connection',
  aj: 'aj'
})

/**
 * Plugin types.
 * @enum
 */
const PluginTypes = Object.freeze({
  ui: 'ui',
  game: 'game'
})

module.exports = { ConnectionMessageTypes, PluginTypes }

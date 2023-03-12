/**
 * Connection message types.
 * @enum
 */
const ConnectionMessageTypes = Object.freeze({
  connection: 'connection',
  aj: 'aj',
  any: '*'
})

/**
 * Plugin types.
 * @enum
 */
const PluginTypes = Object.freeze({
  ui: 'ui',
  game: 'game'
})

const GameType = Object.freeze({
  animalJamClassic: 'animal-jam-classic',
  animalJam: 'animal-jam',
  any: '*'
})

module.exports = { ConnectionMessageTypes, PluginTypes, GameType }

class Util {
  /**
   * Deletes the require cache
   */
  static deleteCache (path) {
    delete require.cache[require.resolve(path)]
  }
}

module.exports = Util

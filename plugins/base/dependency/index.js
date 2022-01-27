module.exports = function ({ dispatch }) {
  const moment = dispatch.require('moment')

  console.log(moment(new Date()).format('YYYY-MM-DD HH:mm:ss'))
}

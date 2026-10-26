const BPromise = require('bluebird')
const fetch = require('node-fetch').default

module.exports = (...args) => BPromise.resolve(fetch(...args))

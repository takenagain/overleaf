const SandboxedModule = require('sandboxed-module')
const chai = require('chai')
const sinon = require('sinon')

chai.use(require('sinon-chai').default)
chai.use(require('chai-as-promised').default)

SandboxedModule.configure({
  requires: {
    '@overleaf/logger': {
      debug() {},
      log() {},
      info() {},
      warn() {},
      error() {},
      err() {},
    },
    '@overleaf/metrics': {
      inc: sinon.stub(),
      count: sinon.stub(),
      histogram: sinon.stub(),
      Timer: class Timer {
        done() {}
      },
    },
  },
  globals: { Buffer, Math, console, process, URL },
  sourceTransformers: {
    removeNodePrefix: function (source) {
      return source.replace(/require\((['"])node:/g, 'require($1')
    },
  },
})

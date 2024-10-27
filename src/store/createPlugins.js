export default (plugins, pluginMap) => {
  if (!pluginMap) {
    return plugins.filter(p => p).map(p => {
      if (typeof p === 'function') return p
      return createPluginObject(p)
    })
  }

  const plugs = plugins.filter(p => p).map(p => {
    if (typeof p !== 'function') {
      p = createPluginObject(p)
    }

    const state = pluginMap.get(p)

    if (state) {
      Object.defineProperty(p, 'state', { value: state, enumerable: false, configurable: true })
    }

    return p
  })

  pluginMap.clear()

  return plugs
}


const createPluginObject = p => {
  const self = { ...p } // ensure plugin has unique self context when used in multiple modules

  const enter = p.enter
    ? (...args) => p.enter.call(self, ...args)
    : function() {}

  if (p.load) {
    enter.load = state => p.load.call(self, state)
  }

  return enter
}




/** example dual plugin w/ shared context

export default () => {
  const ctx = {}

  return {
    start: {
      enter(store, e) {
        ctx.startTime = new Date
      },
    },

    end: { 
      enter(store, e) {
        const duration = new Date - ctx.startTime
        console.log(duration)
      },
    }
  }
}



// usage:

import createMyPlugin from 'my-plugin'

const myPlugin = createMyPlugin()

export const plugins = [
  myPlugin.start,
  before,
  commit,
  after,
  myPlugin.end,
]

**/
export default ({ proto, mod, parent, props }) => {
  const plugins = mod.plugins.map(createPluginObject)
  
  if (!props.plugins && !parent.ancestorPlugins) {
    proto.plugins = plugins
    return
  }

  const descriptor = { value: parent, enumerable: false, configurable: true }
  
  const propPlugins = props.plugins?.map(createPluginObject).map(p => { 
    Object.defineProperty(p, 'state', descriptor)           // propPlugins/ancestors will be run in multiple child dispatch pipelines, but will need access to their own module's state -- also note: we create each one once, so the plugin instance object will be shared across possibly multiple modules
    return p
  }) ?? []

  // order plugins: [mod.plugins (sync), parents, grandParentsEtc, mod.plugins (async)]

  let ancestorPlugins = parent.ancestorPlugins ?? []
  ancestorPlugins = [ ...propPlugins, ...ancestorPlugins ]  // dispatch pipeline will call plugins of closest ancestor modules first, allowing for standard execution of child modules before parents get a chance to interfere :) -- perhaps one "changes its mind" and short-circuits (i.e. returns false) before a parent module finds out that nothing indeed happened
  
  ancestorPlugins.sort((a, b) => !!b.sync - !!a.sync)       // ensure sync plugins are called before async ones, regardless of module

  const index = plugins.findLastIndex(p => p.sync)          // ancestorPlugins could be async, so we must put after sync plugins like `edit`
  plugins.splice(index + 1, 0, ...ancestorPlugins)          // the final plugins to dispatch will be the actual async plugins of the given module

  proto.plugins = plugins
  proto.ancestorPlugins = ancestorPlugins                   // assign ancestors so child modules will again have acecss to them
}


const createPluginObject = p => {
  const enter = typeof p === 'function' ? p : p.enter

  const enterFunc = enter
    ? (...args) => enter.call(enterFunc, ...args)
    : function() {}

  Object.assign(enterFunc, p) // p.load will be assigned, and any other properties used by the plugin -- creating a new object/function, also ensures different instances across modules

  return enterFunc
}




/** example dual plugin w/ shared context

export default () => {
  const mem = {}

  return {
    start: {
      enter(state, e) {
        mem.startTime = new Date
      },
    },

    end: { 
      enter(state, e) {
        const duration = new Date - mem.startTime
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
import before from './before.js'
import reduce from '../reduce.js'
import debounce from './debounce.js'
import end from '../end.js'

import dispatchPlugins from '../../../utils/dispatchPlugins.js'


export default async function edit(state, e) {
  if (!e.event.sync) return
  syncRef.sync = true
  await dispatchPlugins(plugins, state, e)
  return false
}

edit.sync = true

const plugins = [
  before,
  reduce,
  () => delete syncRef.sync,
  debounce,
  end
]

export const syncRef = {} // used so proxy/subscribe.js can render sync events syncronously so input cursors don't jump
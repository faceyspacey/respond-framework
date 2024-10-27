import before from './before.js'
import reduce from '../reduce.js'
import debounce from './debounce.js'
import end from '../end.js'

import dispatchPlugins from '../../../utils/dispatchPlugins.js'


const plugins = [before, reduce, debounce, end]

export default async (store, e) => {
  if (!e.event.sync) return
  await dispatchPlugins(plugins, store, e)
  return false
}
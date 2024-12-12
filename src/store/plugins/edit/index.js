import before from './before.js'
import reduce from '../reduce.js'
import debounce from './debounce.js'
import end from '../end.js'

import dispatchPlugins from '../../../utils/dispatchPlugins.js'


// sync events must run before awaiting any promises for inputs to not mess up the cursor position
// note: even though this runs in an await dispatch, it's still sync, since it still happens syncronously before any awaited promises complete
export default function edit(state, e) {
  if (!e.event.sync) return
  syncRef.sync = true // prevent standard queued microtask listeners from being notified
  return dispatchPlugins(plugins, state, e).then(_ => false)
}

edit.sync = true // mark event as sync, so createPlugins can shift em to front of dispatch pipeline before potentially async events


const notify = ({ respond }, e) => {
  respond.notifyListeners(e.event.ignoreParents !== false) // directly notify listening components syncronously
  syncRef.sync = false
}


const plugins = [
  before,
  reduce,
  notify,
  debounce,
  end
]

export const syncRef = {} // used so valtio/listen.js can render sync events syncronously so input cursors don't jump
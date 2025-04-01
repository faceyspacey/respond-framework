import dispatchPlugins from '../../helpers/dispatchPlugins.js'

import before from './before.js'
import reduce from '../reduce.js'
import debounce from './debounce.js'
import end from '../end.js'



// sync events must run before awaiting any promises for inputs to not mess up the cursor position
// note: even though this runs in an await dispatch, it's still sync, since it still happens syncronously before any awaited promises complete
export default function edit(state, e) {
  if (!e.event.sync) return

  const { ctx } = state.respond
  ctx.sync = true // prevent standard queued microtask listeners from being notified

  const res = dispatchPlugins(plugins, state, e)
  return res instanceof Promise ? res.then(_ => ctx.sync = false) : ctx.sync = false
}

edit.sync = true // mark event as sync, so createPlugins can shift em to front of dispatch pipeline before potentially async events



const plugins = [
  before,
  reduce,
  state => {
    state.respond.commit()
    state.respond.ctx.sync = false
  },
  debounce,
  end
]
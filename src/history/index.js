import { replace, shouldChange } from './utils/pushReplace.js'
import { isDrainsDisabled, hydrateFromSessionStorage} from './utils/backForward.js'
import createTrap from './createTrap.js'
import api from './api.js'
import changePath from './changePath.js'


export default store => {
  if (isDrainsDisabled(store)) {
    return e => shouldChange(e) && replace(store.fromEvent(e).url) // history does nothing in native / when drains disabled
  }

  if (window._changePath) return window._history // HMR

  hydrateFromSessionStorage()
  createTrap() // where the magic happens

  return window._history = { ...api, changePath }
}
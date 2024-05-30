import { replace, shouldChange } from './utils/pushReplace.js'
import { isDrainsDisabled, hydrateFromSessionStorage} from './utils/backForward.js'
import createTrap from './createTrap.js'
import * as api from './api.js'
import changePath from './changePath.js'


export default store => {
  if (isDrainsDisabled(store)) {
    return {
      ...api,
      changePath: e => shouldChange(e) && replace(store.fromEvent(e).url) // history does nothing in native / when drains disabled
    }
  }

  if (store.prevStore?.history) return store.prevStore.history // HMR (don't re-create trap if !!store.options.enableDrainsInDevelopment)

  hydrateFromSessionStorage()
  createTrap() // where the magic happens

  return { ...api, changePath }
}
import { isPopDisabled, hydrateFromSessionStorage} from './utils/backForward.js'
import changePath from './changePath.mock.js'
import * as api from './api.js'
import state from './browserState.js'


export default store => {
  if (isPopDisabled(store)) {
    return { ...api, state, changePath }
  }

  hydrateFromSessionStorage()

  return { ...api, state }
}
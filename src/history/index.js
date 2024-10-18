import { isPopDisabled, hydrateFromSessionStorage} from './utils/backForward.js'
import changePath from './changePath.js'
import changePathMock from './changePath.mock.js'
import { linkOut } from './out.js'
import state from './browserState.js'


export default () => {
  if (isPopDisabled()) {
    return { state, linkOut, changePath: changePathMock }
  }

  hydrateFromSessionStorage()

  return { state, linkOut, changePath }
}
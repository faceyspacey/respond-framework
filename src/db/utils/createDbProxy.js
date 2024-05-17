import { createControllerMethod as mock } from '../createClientDatabase.mock.js'
import { createControllerMethod as real } from '../createClientDatabase.js'
import { isProd } from '../../utils/bools.js'


export default (prev, modulePath = '') => {
  const db = new Proxy({ ...prev }, {
    get(target, controller) {
      const v = target[controller] // not a controller (options, store)
      if (v !== undefined) return v

      return new Proxy({}, {
        get(_, method) {
          return createControllerMethod(db, controller, method, modulePath)
        }
      })
    }
  })

  return db
}


export const createControllerMethod = isProd ? real : mock
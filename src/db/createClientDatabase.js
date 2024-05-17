import fetch from './fetch.js'
import createDbProxy from './utils/createDbProxy.js'
import mock from './createClientDatabase.mock.js'
import { isProd } from '../utils/bools.js'


export default !isProd ? mock : topModule => {
  const options = {
    getContext() {},
    onServerDown() {},
    onServerUp() {},
    retryRequest(db, modulePath, controller, method, args) {
      const meth = createControllerMethod(db, controller, method, modulePath)
      return meth(...args)
    },
    sendNotification(db, ...args) {
      return db.store.devtools.sendNotification(...args)
    },
    ...topModule.db
  }

  return createDbProxy({ options })
}



export const createControllerMethod = (db, controller, method, modulePath = '') => {
  const { options } = db

  return async function(...argsRaw) {
    const { token, userId } = db.store.state
    const ctx = { token, userId, ...options.getContext(db, controller, method, argsRaw) }

    try {
      const first = options.madeFirst ? false : true

      const args = argsRaw.map(a => a === undefined ? '__undefined__' : a) // undefined becomes null when stringified, but controller functions may depend on undefined args and default parameters, so we convert this back to undefined server side

      const context = { ...ctx, modulePath, controller, method, args, first }
      const response = await fetch(context, options.apiUrl)

      options.madeFirst = true
    
      options.sendNotification(db, { type: `=> db.${controller}.${method}`, ...context, response })
      options.onServerUp(db)

      return response
    }
    catch (error) {
      console.warn('db timeout: retrying every 12 seconds...', error)
      options.onServerDown(db)
      return options.retryRequest(db, modulePath, controller, method, argsRaw) // requests timeout after 12 seconds by default, and it's the only way to trigger this error, so we know it its in need of a retry
    }
  }
}
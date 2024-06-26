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

  return createDbProxy({ options, createControllerMethod })
}



const createControllerMethod = (db, controller, method, modulePath = '') => {
  const { options } = db
  
  const { apiUrl } = options
  const url = typeof apiUrl === 'function' ? apiUrl(db) : apiUrl

  return async function(...argsRaw) {
    const { token, userId, adminUserId } = db.store.state
    const ctx = { token, userId, adminUserId, ...options.getContext(db, controller, method, argsRaw) }

    try {
      const first = options.madeFirst ? false : true

      const args = argsRaw.map(a => a === undefined ? '__undefined__' : a) // undefined becomes null when stringified, but controller functions may depend on undefined args and default parameters, so we convert this back to undefined server side

      const context = { ...ctx, modulePath, controller, method, args, first }
      const response = await fetch(context, url)

      options.madeFirst = true
    
      options.sendNotification(db, { type: `=> db.${controller}.${method}`, ...context, response })
      
      if (_serverDown) {
        _serverDown = false
        options.onServerUp(db)
      }

      return response
    }
    catch (error) {
      _serverDown = true
      console.warn('db timeout: retrying every 12 seconds...', error)           // fetch made with 12 second timeout, then throw -- see fetchWithTimeout.js
      options.onServerDown(db)
      return options.retryRequest(db, modulePath, controller, method, argsRaw)  // timeouts are the only way to trigger this error, so we know it its in need of a retry
    }
  }
}

let _serverDown
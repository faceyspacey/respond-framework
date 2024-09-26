import fetch from './fetch.js'
import createDbProxy from './utils/createDbProxy.js'
import mock from './createClientDatabase.mock.js'
import { isProd } from '../utils/bools.js'
import mergeProps from './utils/mergeProps.js'


export default !isProd ? mock : (db, parentDb, props, store) => {
  if (!db) return createDbProxy({ ...parentDb, store })
    
  if (props?.db) mergeProps(db, props.db)

  return createDbProxy({
    options: {
      getContext() {},
      onServerUp: store => store._serverDown = false,
      onServerDown: store => store._serverDown = true,
      retryRequest(controller, method, args) {
        return this._call(controller, method)(...args)
      },
      ...db.options
    },
    _call(controller, method) {
      const { options, store } = this
      const { models, modulePath } = store

      const { apiUrl } = options
      const url = typeof apiUrl === 'function' ? apiUrl(store) : apiUrl
    
      if (method === 'make') {
        return doc => new models[controller]({ ...doc, __type: controller })
      }
    
      return async function(...args) {
        const { token, userId, adminUserId } = store
        const ctx = { token, userId, adminUserId, ...options.getContext(store, controller, method, args) }
    
        try {
          const first = store.ctx.madeFirst ? false : true
    
          const context = { ...ctx, modulePath, controller, method, args, first }
          const response = await fetch(context, url, models)
    
          store.ctx.madeFirst = true
        
          store.devtools.sendNotification({ type: `=> db.${controller}.${method}`, ...context, response })
          
          if (_serverDown) {
            _serverDown = false
            options.onServerUp(store)
          }
    
          return response
        }
        catch (error) {
          _serverDown = true
          console.warn('db timeout: retrying every 12 seconds...', error)     // fetch made with 12 second timeout, then throw -- see fetchWithTimeout.js
          options.onServerDown(store)
          return options.retryRequest(controller, method, args)            // timeouts are the only way to trigger this error, so we know it its in need of a retry
        }
      }
    }
  })
}



let _serverDown
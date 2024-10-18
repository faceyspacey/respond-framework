import fetch from './fetch.js'
import createDbProxy from './utils/createDbProxy.js'
import mock from './createClientDatabase.mock.js'
import { isProd } from '../utils/bools.js'
import mergeProps from './utils/mergeProps.js'
import createApiCache from './utils/createApiCache.js'
import { ObjectId } from 'bson'


export default !isProd ? mock : (db, parentDb, props, state) => {
  if (!db && !parentDb) db = {}
  else if (!db) return parentDb
    
  if (props?.db) mergeProps(db, props.db)

  state.apiCache = createApiCache()

  return createDbProxy({
    options: {
      getContext() {},
      onServerUp: state => state._serverDown = false,
      onServerDown: state => state._serverDown = true,
      retryRequest(controller, method, args) {
        return this._call(controller, method)(...args)
      },
      ...db.options
    },
    _call(controller, method) {
      const { options, state } = this
      const { models, modulePath } = state

      const { apiUrl } = options
      const url = typeof apiUrl === 'function' ? apiUrl(state) : apiUrl
    
      if (method === 'make') {
        return d => models[controller]({ ...d, __type: controller }, modulePath)
      }
      
      if (method === 'create') {
        return d => models[controller]({ ...d, __type: controller, id: d?.id || obId() }, modulePath)
      }
    
      let useCache
      meth.cache = function(...args) { useCache = true; return meth(...args); }
      
      return meth

      async function meth(...args) {
        const { token, userId, adminUserId } = state
        const context = { token, userId, adminUserId, ...options.getContext(state, controller, method, args) }
    
        try {
          const first = state.ctx.madeFirst ? false : true
    
          const body = { ...context, modulePath, controller, method, args, first }
          const response = await fetch(url, body, state, models, useCache)
    
          state.ctx.madeFirst = true
        
          state.devtools.sendNotification({ type: `=> db.${controller}.${method}`, ...body, response })
          
          if (_serverDown) {
            _serverDown = false
            options.onServerUp(state)
          }
    
          return response
        }
        catch (error) {
          _serverDown = true
          console.warn('db timeout: retrying every 12 seconds...', error)     // fetch made with 12 second timeout, then throw -- see fetchWithTimeout.js
          options.onServerDown(state)
          return options.retryRequest(controller, method, args)            // timeouts are the only way to trigger this error, so we know it its in need of a retry
        }
      }
    }
  })
}



let _serverDown

const obId = () => new ObjectId().toString()
import fetch from './fetch.js'
import createDbProxy from './utils/createDbProxy.js'
import mock from './createClientDatabase.mock.js'
import { isProd } from '../utils/bools.js'
import createApiCache from './utils/createApiCache.js'
import { ObjectId } from 'bson'


export default !isProd ? mock : ({ mod, proto, state, respond, branch }) => {
  let { db } = mod
  
  if (!db && !parent.db) db = {}
  else if (!db) return respond.db = proto.db = parent.db

  const clientReviver = createApiReviverForClient(respond, branch)

  const cache = createApiCache(state)

  const {
    apiUrl,
    getContext,
    onServerUp = state => state._serverDown = false,
    onServerDown = state => state._serverDown = true,
    retryRequest = (table, method, args) => call(table, method)(...args),
  } = respond.options
  
  return respond.db = proto.db = createDbProxy({
    cache,
    call: function call(table, method) {
      if (method === 'make') {
        return d => respond.models[table]({ ...d, __type: table }, branch)
      }
      
      if (method === 'create') {
        return d => respond.models[table]({ ...d, __type: table, id: d?.id || obId() }, branch)
      }
    
      let useCache
      meth.cache = function(...args) { useCache = true; return meth(...args); }
      
      meth.server = function(...args) { return meth(...args); } // only for usage during development; if used in production, does the same as normal

      return meth

      async function meth(...args) {
        const { token, userId, adminUserId, basename, basenameFull } = state
        const context = { token, userId, adminUserId, basename, basenameFull, ...getContext?.call(state, table, method, args) }
    
        try {
          const body = { ...context, branch, table, method, args, first: !state.__dbFirstCall }
          const response = await fetch(apiUrl, body, clientReviver, useCache && cache)
    
          state.__dbFirstCall = true
        
          state.devtools.sendNotification({ type: `=> db.${table}.${method}`, ...body, response })
          
          if (_serverDown) {
            _serverDown = false
            onServerUp(state)
          }
    
          return response
        }
        catch (error) {
          _serverDown = true
          console.warn('db timeout: retrying every 12 seconds...', error)     // fetch made with 12 second timeout, then throw -- see fetchWithTimeout.js
          onServerDown(state)
          return retryRequest(ontroller, method, args)            // timeouts are the only way to trigger this error, so we know it its in need of a retry
        }
      }
    }
  })
}



let _serverDown

const obId = () => new ObjectId().toString()
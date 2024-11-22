import fetch, { argsIn } from './fetch.js'
import simulateLatency from '../utils/simulateLatency.js'
import secret from './secret.mock.js'
import createDbProxy from './utils/createDbProxy.js'
import createApiCache from './utils/createApiCache.js'
import obId from '../utils/objectIdDevelopment.js'
import { createApiReviverForClient, createReviver as createApiReviverForServer } from '../utils/revive.js'

export default (db, parentDb, state, respond, branch) => {
  if (!db && !parentDb) {
    ({ db, options } = respond.findClosestAncestorWith('db', branch) ?? {}) // focused module is a child without its own db, but who expects to use a parent module's db when in production
  }
  else if (!db) return parentDb

  const models = respond.models = {} // ref must exist now for createApiReviverForClient

  const clientReviver = createApiReviverForClient(respond, branch)
  const serverReviver = createApiReviverForServer(respond.geStore().respond.db ?? db) // needs top focusedBranch's db to simulate reviver on server, which will then find controllers based on branch
  
  const reviveClient = (res = {}) => JSON.parse(JSON.stringify(res), clientReviver)   // simulate production fetch reviver
  const reviveServer = args =>       JSON.parse(JSON.stringify(args), serverReviver)  // simulate production server express.json reviver

  const cache = createApiCache(state)
  const { apiUrl, getContext } = respond.options

  return respond.db = createDbProxy({
    models,
    cache,
    call(controller, method) {
      const Model = models[controller]

      if (method === 'make') {
        return d => new Model({ ...d, __type: controller }, branch)
      }

      if (method === 'create') {
        return d => new Model({ ...d, __type: controller, id: d?.id || obId() }, branch)
      }
    
      let useCache
      meth.cache = function(...args) { useCache = true; return meth(...args); }

      let useServer
      meth.server = function(...args) { useServer = true; return meth(...args); }
      
      return meth

      async function meth(...args) {
        const Controller = db.controllers[controller]
        if (!Controller) throw new Error(`controller "${controller}" does not exist in ${branch ?? 'top'} module`)
    
        const { token, userId, adminUserId, basename, basenameFull } = state.getStore()
        const context = { token, userId, adminUserId, basename, basenameFull, ...getContext?.call(state, controller, method, args) }
        const body = { ...context, branch, controller, method, args: reviveServer(argsIn(args)), first: !state.__dbFirstCall  }
    
        const cached = useCache && cache.get(body)

        if (cached) {
          const response = Object.assign({}, cached, { meta: { dbCached: true } })
          return handleResponse(state, { branch, controller, method, args, response })
        }

        const response = useServer
          ? await fetch(apiUrl, body, clientReviver)
          : reviveClient(await new Controller(secret).call(body))

        await simulateLatency(state, useServer)

        if (useCache) cache.set(body, response)

        return handleResponse(state, { branch, controller, method, args, response })
      }
    }
  })
}


const handleResponse = (state, n) => {
  state.__dbFirstCall = true

  Promise.resolve().then().then().then().then().then(() => { // rather than a queue/flush approach (which we had and had its own problems due different usages in userland), hopping over the calling event callback preserves the correct order in the devtools most the time, given this always runs very fast in the client (note only 2 .thens are needed most of the time, but it requires normally 8 to skip over a single basic subsequent event, so 5 .thens has a better chance of hopping over a more complicated callback with multiple async calls)
    const type = `=> db.${n.controller}.${n.method}`
    state.devtools.sendNotification({ type, ...n })
  })

  return n.response
}
import fetch, { argsIn } from './fetch.js'
import simulateLatency from '../utils/simulateLatency.js'
import secret from './secret.mock.js'
import clean from './utils/cleanLikeProduction.js'
import createDbProxy from './utils/createDbProxy.js'
import mergeProps from './utils/mergeProps.js'
import createApiCache from './utils/createApiCache.js'
import obId from '../utils/objectIdDevelopment.js'


export default (db, parentDb, props, state, respond, branch) => {
  let { options } = respond

  if (!db && !parentDb) {
    ({ db, options } = respond.findClosestAncestorWith('db', branch) ?? {}) // focused module is a child without its own db, but who expects to use a parent module's db
  }
  else if (!db) return parentDb

  if (props?.db) mergeProps(db, props.db)

  const cache = createApiCache(state)

  return createDbProxy({
    cache,
    developer: new Proxy({}, {
      get(_, method) {
        return async (...args) => {
          const body = { controller: 'developer', method, args }
          const response = await fetch(options.apiUrl, body, state)
          return handleResponse(state, { ...body, response })
        }
      }
    }),
    _call(controller, method) {
      const { models, branch } = state
    
      const Model = models[controller]

      if (method === 'make') {
        return d => new Model({ ...d, __type: controller }, branch)
      }

      if (method === 'create') {
        return d => new Model({ ...d, __type: controller, id: d?.id || obId() }, branch)
      }
    
      let useCache
      meth.cache = function(...args) { useCache = true; return meth(...args); }
      
      return meth

      async function meth(...args) {
        const Controller = db.controllers[controller]
        if (!Controller) throw new Error(`controller "${controller}" does not exist in ${branch ?? 'top'} module`)
    
        const { token, userId, adminUserId, basename, basenameFull } = state.getStore()
        const context = { token, userId, adminUserId, basename, basenameFull, ...options.getContext(state, controller, method, args) }
        const body = { ...context, branch, controller, method, args: clean(argsIn(args), state), first: !state.__dbFirstCall  }
    
        const cached = useCache && cache.get(body)

        if (cached) {
          const response = Object.assign({}, cached, { meta: { dbCached: true } })
          return handleResponse(state, { branch, controller, method, args, response })
        }

        const res = await new Controller(secret)._callFilteredByRole(body)

        await simulateLatency(state)
        const response = clean(res, state, branch)

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
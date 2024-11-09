import fetch, { argsIn } from './fetch.js'
import simulateLatency from '../utils/simulateLatency.js'
import secret from './secret.mock.js'
import clean from './utils/cleanLikeProduction.js'
import createControllers from './createControllers.js'
import createDbProxy from './utils/createDbProxy.js'
import mergeProps from './utils/mergeProps.js'
import createApiCache from './utils/createApiCache.js'
import obId from '../utils/objectIdDevelopment.js'


export default (db, parentDb, props, state, respond, modulePath) => {
  if (!db && !parentDb) db = respond.findInClosestAncestor('db', modulePath) ?? {}
  else if (!db) return parentDb

  if (props?.db) mergeProps(db, props.db)

  const controllers = createControllers(db, respond)
  const cache = createApiCache(state)

  return createDbProxy({
    cache,
    options: { getContext() {}, ...db.options },
    developer: new Proxy({}, {
      get(_, method) {
        return async (...args) => {
          const body = { controller: 'developer', method, args }
          const response = await fetch(db.options?.apiUrl, body, state)
          return handleResponse(state, { ...body, response })
        }
      }
    }),
    _call(controller, method) {
      const { options } = this
      const { models, modulePath } = state
    
      const Model = models[controller]

      if (method === 'make') {
        return d => new Model({ ...d, __type: controller }, modulePath)
      }

      if (method === 'create') {
        return d => new Model({ ...d, __type: controller, id: d?.id || obId() }, modulePath)
      }
    
      let useCache
      meth.cache = function(...args) { useCache = true; return meth(...args); }
      
      return meth

      async function meth(...args) {
        const Controller = controllers[controller]
        if (!Controller) throw new Error(`controller "${controller}" does not exist in ${modulePath ?? 'top'} module`)
    
        const { token, userId, adminUserId, basename, basenameFull } = state.getStore()
        const context = { token, userId, adminUserId, basename, basenameFull, ...options.getContext(state, controller, method, args) }
        const body = { ...context, modulePath, controller, method, args: clean(argsIn(args), state), first: !state.__dbFirstCall  }
    
        const cached = useCache && cache.get(body)

        if (cached) {
          const response = Object.assign({}, cached, { meta: { dbCached: true } })
          return handleResponse(state, { modulePath, controller, method, args, response })
        }

        const res = await new Controller(secret)._callFilteredByRole(body)

        await simulateLatency(store)
        const response = clean(res, state, modulePath)

        if (useCache) cache.set(body, response)

        return handleResponse(state, { modulePath, controller, method, args, response })
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
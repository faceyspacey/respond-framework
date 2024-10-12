import fetch, { argsIn } from './fetch.js'
import simulateLatency from '../utils/simulateLatency.js'
import secret from './secret.mock.js'
import clean from './utils/cleanLikeProduction.js'
import createControllers from './createControllers.js'
import createDbProxy from './utils/createDbProxy.js'
import mergeProps from './utils/mergeProps.js'
import createApiCache from './utils/createApiCache.js'
import { replacer, createReviver } from '../utils/revive.js'


export default (db, parentDb, props, store, findInClosestParent) => {
  if (!db && !parentDb) db = findInClosestParent('db') ?? {}
  else if (!db) return createDbProxy({ ...parentDb })

  if (props?.db) mergeProps(db, props.db)

  const controllers = createControllers(db)
  const cache = store.apiCache = createApiCache()

  return createDbProxy({
    options: { getContext() {}, ...db.options },
    developer: new Proxy({}, {
      get(_, method) {
        return async (...args) => {
          const context = { controller: 'developer', method, args }
          const response = await fetch(context, db.options?.apiUrl, store)
          return sendNotification(store, { ...context, response })
        }
      }
    }),
    _call(controller, method, useCache) {
      const { options } = this
      const { models, modulePath, ctx } = store
    
      if (method === 'make') {
        return doc => new models[controller]({ ...doc, __type: controller }, modulePath)
      }
    
      return async (...args) => {
        const c = controllers[controller]
        if (!c) throw new Error(`controller "${controller}" does not exist in ${modulePath ?? 'top'} module`)
    
        const { token, userId, adminUserId } = store.getStore()
        const info = { token, userId, adminUserId, ...options.getContext(store, controller, method, args) }
        const context = { ...info, modulePath, controller, method, args: clean(argsIn(args), store), first: !ctx.madeFirst, request: {} }
    
        let response

        if (useCache) {
          const cached = cache.get(context)
          if (cached) response = JSON.parse(cached, createReviver(store, modulePath))
        }

        if (!response) {
          const instance = { ...c, secret }
          const res = await instance._callFilteredByRole(context)

          await simulateLatency(store)
          response = clean(res, store, modulePath)
        }

        const model = models[controller]?.prototype
        const shouldCache = useCache ?? model?.shouldCache ?? method.indexOf('find') === 0

        if (shouldCache) cache.set(context, JSON.stringify(response, replacer))

        return sendNotification(store, { modulePath, controller, method, args, response })
      }
    }
  })
}


const sendNotification = (store, n) => {
  store.ctx.madeFirst = true

  Promise.resolve().then().then().then().then().then(() => { // rather than a queue/flush approach (which we had and had its own problems due different usages in userland), hopping over the calling event callback preserves the correct order in the devtools most the time, given this always runs very fast in the client (note only 2 .thens are needed most of the time, but it requires normally 8 to skip over a single basic subsequent event, so 5 .thens has a better chance of hopping over a more complicated callback with multiple async calls)
    const type = `=> db.${n.controller}.${n.method}`
    store.devtools.sendNotification({ type, ...n })
  })

  return n.response
}



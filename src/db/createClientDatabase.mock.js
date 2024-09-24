import fetch from './fetch.js'
import simulateLatency from '../utils/simulateLatency.js'
import secret from './secret.mock.js'
import cleanLikeProduction from './utils/cleanLikeProduction.js'
import createControllers from './createControllers.js'
import createDbProxy from './utils/createDbProxy.js'


export default (db, parentDb, store) => {
  if (!db) return createDbProxy({ ...parentDb })

  const controllers = createControllers(db)

  return createDbProxy({
    options: { getContext() {}, ...db.options },
    developer: new Proxy({}, {
      get(_, method) {
        return async (...args) => {
          args = args.map(a => a === undefined ? '__undefined__' : a)
          
          const context = { controller: 'developer', method, args }
          const response = await fetch(context, db.options?.apiUrl)
    
          sendNotification(store, { type: `=> db.developer.${method}`, ...context, response })
    
          return response
        }
      }
    }),
    _call(controller, method) {
      const { options } = this
      const { models, modulePath } = store
    
      if (method === 'make') {
        return doc => new models[controller]({ ...doc, __type: controller })
      }
    
      return async function(...argsRaw) {
        const c = controllers[controller]
    
        if (!c) {
          throw new Error(`controller "${controller}" does not exist in ${modulePath ? `module "${modulePath}"` : `top module`}`)
        }
    
        const { token, userId, adminUserId } = store.getStore()
        const ctx = { token, userId, adminUserId, ...options.getContext(store, controller, method, argsRaw) }
    
        const args = cleanLikeProduction(argsRaw.map(a => a === undefined ? '__undefined__' : a)) // undefined becomes null when stringified, but controller functions may depend on undefined args and default parameters, so we convert this back to undefined server side
    
        const first = store.ctx.madeFirst ? false : true
        const context = { ...ctx, modulePath, controller, method, args, first, request: {} }
    
        const instance = { ...c, secret }
        const res = await instance._callFilteredByRole(context)
    
        store.ctx.madeFirst = true
    
        await simulateLatency(store)
    
        const response = cleanLikeProduction(res, models)
    
        sendNotification(store, { type: `=> db.${controller}.${method}`, controller, method, args, response, __modulePath: modulePath })
    
        return response
      }
    }
  })
}


const sendNotification = (store, notification) => {
  Promise.resolve().then().then().then().then().then(() => { // rather than a queue/flush approach (which we had and had its own problems due different usages in userland), hopping over the calling event callback preserves the correct order in the devtools most the time, given this always runs very fast in the client (note only 2 .thens are needed most of the time, but it requires normally 8 to skip over a single basic subsequent event, so 5 .thens has a better chance of hopping over a more complicated callback with multiple async calls)
    store.devtools.sendNotification(notification)
  })
}
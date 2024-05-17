import createDeveloperController from './createDeveloperController.js'
import simulateLatency from '../utils/simulateLatency.js'
import secretMock from './secret.mock.js'
import cleanLikeProduction from './utils/cleanLikeProduction.js'
import createControllers from './createControllers.js'
import createDbProxy from './utils/createDbProxy.js'


export default topModule => {
  const options = {
    nested: false,
    simulateLatency,
    secret: secretMock,
    getContext() {},
    sendNotification(db, ...args) {
      return db.store.devtools.sendNotification(...args)
    },
    ...topModule.db
  }
  
  options._controllers = createControllers(topModule, options)

  const db = createDbProxy({ options })

  db.developer = createDeveloperController(db)

  return db
}




export const createControllerMethod = (db, controller, method, modulePath = '') => {
  const { options } = db

  return async function(...argsRaw) {
    const c = options.nested
      ? options._controllers[modulePath][controller] // DYNAMIC MODULE-SPECIFIC SELECTION, eg: _controllers['admin.foo'].user
      : options._controllers[controller]

    if (!c) {
      throw new Error(`controller "${controller}" does not exist in ${modulePath ? `module "${modulePath}"` : `top module`}`)
    }

    const { token, userId } = db.store.state
    const ctx = { token, userId, ...options.getContext(db, controller, method, argsRaw) }

    const args = cleanLikeProduction(argsRaw.map(a => a === undefined ? '__undefined__' : a)) // undefined becomes null when stringified, but controller functions may depend on undefined args and default parameters, so we convert this back to undefined server side

    const first = options.madeFirst ? false : true
    const context = { ...ctx, modulePath, controller, method, args, first, request: {} }

    const instance = { ...c, secret: options.secret }
    const res = await instance._callFilteredByRole(context)

    options.madeFirst = true

    await options.simulateLatency(db)

    const response = cleanLikeProduction(res)

    Promise.resolve().then().then().then().then().then(() => { // rather than a queue/flush approach (which is unreliable due different usages in userland), hopping over the calling event callback preserves the correct order in the devtools most the time, given this always runs very fast in the client (note only 2 .thens are needed most of the time, but it requires normally 8 to skip over a single basic subsequent event, so 5 .thens has a better chance of hopping over a more complicated callback with multiple async calls)
      options.sendNotification(db, { type: `=> db.${controller}.${method}`, controller, method, args, response, __modulePath: modulePath })
    })

    return response
  }
}
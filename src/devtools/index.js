
import connect from './utils/connect.js'
import subscribe from './subscribe.js'
import { prependModulePathToE as fullPath } from '../utils/sliceByModulePath.js'
import orderState from './utils/orderState.js'
import order from './utils/orderEventKeys.js'


export default store => {
  const prevStore = window.store
  const _devtools = connect(store)

  const isHMR = prevStore && !store.replays?.replay

  if (!prevStore || !isHMR) {
    _devtools.init(orderState(store.state, store, store.topModule))
  }

  prevStore?.devtools.unsubscribe()
  
  const triggerIndexes = {}

  const send = (e, state = store.state) => _devtools.send(order(e), state)

  return {
    index: isHMR ? prevStore.devtools.index : 0,
    unsubscribe: _devtools.subscribe(subscribe(store, triggerIndexes)),

    send(e) {
      if (silent(store, e)) return

      const { evsIndex, evs = {} } = store.state.replayTools || {} // replayTools not available in production
      const isTrigger = evs[evsIndex]?.event === e.event // works as long as you don't send the same event in a loop, which is very unlikely

      triggerIndexes[++this.index] = evsIndex

      e = fullPath(e)
      e.type = isTrigger ? '>> ' + e.type : e.type

      send(e)
    },
  
    sendPluginNotification(n, origin) {
      if (silent(store, origin, true)) return
      if (!origin) return this.sendNotification(n)

      triggerIndexes[++this.index] = store.state.replayTools?.evsIndex

      const arrow = n.returned === false ? '<- ' : '-> '

      origin = fullPath(origin)

      const type = arrow + origin.type + '.' + n.type
      const __developer = n.__developer || '-> This is a plugin notification. No reduction occurred.'
  
      const e = { ...n, type, origin, __developer }

      send(e)
    },

    sendNotification(n, state = store.state) {
      if (silent(store, origin, true)) return
      this.forceNotification(n, state)
    },

    forceNotification(n, state = store.state) {
      triggerIndexes[++this.index] = store.state.replayTools?.evsIndex

      const isEvent = typeof n.event === 'function'

      n = isEvent ? fullPath(n) : n
      
      const type = n.__prefix
        ? n.__prefix + n.type 
        : />|@/.test(n.type) > -1 ? n.type : '-> ' + n.type
        
      const __developer = n.__developer || '-> This is just a notification. No reduction occurred.'

      send({ ...n, type, __developer }, state)
    },

    sendPrevented(n, e) {
      if (silent(store, e)) return

      triggerIndexes[++this.index] = store.state.replayTools?.evsIndex

      e = fullPath(e)

      const type = '<< ' + e.type + '.' + n.type
      const __developer = `${type} prevented. No reduction occurred.`

      send({ ...e, type, returned: n.returned, __developer })
    },

    sendRedirect(n, e) {
      if (silent(store, e)) return

      triggerIndexes[++this.index] = store.state.replayTools?.evsIndex

      e = fullPath(e)
      const redirect = fullPath(n.returned)

      const type = '<< ' + e.type + '.' + n.type
      const __developer = `${type} redirected to ${redirect.type}. No reduction occurred.`

      send({ ...e, type, returned: n.returned, __developer })
    }
  }
}


const silent = (store, e, advanced = false) =>
  (e?.modulePath === 'replayTools' && !store.replays.options.log) ||
  (advanced && !store.replays?.settings.advanced)

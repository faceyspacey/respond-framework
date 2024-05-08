import sliceByModulePath from '../../../utils/sliceByModulePath.js'


export default (name, options, form, store) => {
  if (name === 'path') {
    const modulePath = form.module
    const { eventsAll } = store.getStore() // escape hatch: must use top level events to generate all paths

    const slicedEvents = sliceByModulePath(eventsAll, modulePath)

    return createPathOptions(slicedEvents, modulePath, store)
  }
  
  if (typeof options === 'function') {
    return options(form, store)
  }

  return options || booleans
}


const cache = {}
const booleans = [{ value: true, text: 'True' }, { value: false, text: 'False' }]


export const createPathOptions = (events, modulePath, store) => {
  const cacheKey = store.replays.settings.module + '.' + modulePath // modulePath isn't enought as the cache key, as it will change depending on what the active module is

  if (cache[cacheKey]) return cache[cacheKey]

  return cache[cacheKey] = Object.keys(events).reduce((acc, k) => {
    const event = events[k]

    if (typeof event === 'function') {
      if (event.path) {
        if (event.path.indexOf(':') === -1) {
          const value = event.path
          const label = event.namespace ? `${event.namespace}: ${value}` : value
          acc.push({ value, label })
        }
        else if (event.settingsParams) {
          event.settingsParams.forEach(params => {
            const e = event(params)

            const value = store.fromEvent(e).pathname
            const label = event.namespace ? `${event.namespace}: ${value}` : value

            acc.push({ value, label })
          })
        }
      }

      return acc
    }
    
    const childPath = modulePath ? `${modulePath}.${k}` : k
    
    if (typeof event === 'object') {
      const eventsNamespace = event
      acc.push(...createPathOptions(eventsNamespace, childPath, store))
    }

    return acc
  }, [])
}

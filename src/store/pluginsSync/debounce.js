export default async (store, e) => {
  const func = e.event.debounce
  if (!func) return

  const debounced = weakMap.get(func) || create(func, e.event.debounceDuration)

  const res = await debounced.call(e.event, store, e)
  
  if (res !== false) {
    store.devtools.forceNotification({ ...e, __prefix: '>> ' })
    store.devtools.sendPluginNotification({ ...e.arg, type: 'debounce', returned: res }, e)
  }

  if (res?.error) {
    await e.event.error.dispatch(res, { from: e })
  }
  else if (res) {
    await e.event.done.dispatch(res, { from: e })
  }
  
  return res
}




const weakMap = new WeakMap

const create = func => {
  const debounced = debounce(func)
  weakMap.set(func, debounced)
  return debounced
}

const debounce = (func, ms = 300) => {
  if (process.env.NODE_ENV === 'test') return func

  let timer
  
  return (...args) => {
    if (window.isFastReplay) {
      return func.call(this, ...args)
    }
    
    clearTimeout(timer)
    
    return new Promise(resolve => {
      timer = setTimeout(async () => {
        resolve(func.call(this, ...args))
      }, ms)

      // resolve all promises, so plugin pipeline always exits
      // successfull uncleared calls will occur before this, and therefore this will have no effect
      setTimeout(() => resolve(false), ms + 1)
    })
  }
}

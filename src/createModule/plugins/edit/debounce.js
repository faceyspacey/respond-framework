export default async (state, e) => {
  const func = e.event.debounce
  if (!func) return
  
  const debounced = weakMap.get(func) ?? create(func, e.event.debounceDuration, e.event.leading)

  const res = await debounced.call(state, state, e)
  
  if (res !== false) {
    state.respond.devtools.forceNotification({ ...e, __prefix: '>> ' })
    state.respond.devtools.sendPluginNotification({ ...e.arg, type: 'debounce', returned: res }, e)
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

const create = (func, ms = 300, leading = true) => {
  const debounced = leading ? debounceWithLeading(func, ms) : debounce(func, ms)
  weakMap.set(func, debounced)
  return debounced
}

const debounce = (func, ms = 300) => {
  if (process.env.NODE_ENV === 'test') return func

  let timer
  
  return (...args) => {
    if (window.state?.respond.mem.isFastReplay) {
      return func.call(this, ...args)
    }
    
    clearTimeout(timer)
    
    return new Promise(resolve => {
      timer = setTimeout(() => {
        resolve(func.call(this, ...args))
      }, ms)

      // resolve all promises, so plugin pipeline always exits
      // successful uncleared calls will occur before this, and therefore this will have no effect
      setTimeout(() => resolve(false), ms + 1)
    })
  }
}




const debounceWithLeading = (func, ms = 300) => {
  if (process.env.NODE_ENV === 'test') return func

  let timer
  
  return (...args) => {
    if (window.state?.respond.mem.isFastReplay) {
      return func.call(this, ...args)
    }

    clearTimeout(timer)

    return new Promise(resolve => {
      timer = setTimeout(() => {
        setTimeout(() => timer = null, ms)
        resolve(func.call(this, ...args))
      }, timer ? ms : 0)

      setTimeout(() => resolve(false), ms + 1)
    })
  }
}
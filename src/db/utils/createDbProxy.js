export default (prev, modulePath = '') =>
  new Proxy({ ...prev }, {
    get(target, k, db) {
      const v = target[k] // not a controller, eg: options, store, createControllerMethod
      if (v !== undefined) return v

      const controller = k
      
      return new Proxy({}, {
        get(_, method) {
          return prev.createControllerMethod(db, controller, method, modulePath)
        }
      })
    }
  })
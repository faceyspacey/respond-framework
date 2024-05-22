export default (prev, modulePath = '') => {
  const db = new Proxy({ ...prev }, {
    get(target, k) {
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

  return db
}
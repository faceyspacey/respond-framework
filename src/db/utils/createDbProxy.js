export default db =>
  new Proxy(db, {
    get(_, controller) {
      if (db[controller]) return db[controller] // not a controller

      const get = (_, method) => {
        if (method === 'cache') {
          const get = (_, methodActual) => db._call(controller, methodActual, true)
          return new Proxy({}, { get })
        }

        return db._call(controller, method)
      }

      return new Proxy({}, { get })
    }
  })
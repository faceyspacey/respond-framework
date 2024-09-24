export default db =>
  new Proxy(db, {
    get(_, controller) {
      if (db[controller]) return db[controller] // not a controller

      const get = (_, method) => db._call(controller, method)
      return new Proxy({}, { get })
    }
  })
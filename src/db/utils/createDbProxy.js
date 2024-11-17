export default db =>
  new Proxy(db, {
    get(_, controller) {
      if (db[controller]) return db[controller] // not a controller

      const get = (_, method) => db.call(controller, method)
      return new Proxy({}, { get })
    }
  })
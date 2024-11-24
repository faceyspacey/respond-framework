export default db =>
  new Proxy(db, {
    get(_, table) {
      if (db[table]) return db[table] // not a table

      const get = (_, method) => db.call(table, method)
      return new Proxy({}, { get })
    }
  })
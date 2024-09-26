export default (db, props) => {
  for (const k in props) {
    db[k] = Object.assign(db[k] ?? {}, props[k])
  }
}
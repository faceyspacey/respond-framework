export default (state, e) => {
  if (!e.event.run) return
  const res = e.event.run(state, e)
  return res instanceof Promise ? res.then(_ => false) : false
}
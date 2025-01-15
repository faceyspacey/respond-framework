export default (state, e) => {
  if (!e.event.run) return
  return e.event.run(state, e).then(_ => false)
}
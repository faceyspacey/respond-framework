export default (curr, e, { events, respond }) => {
  if (!curr && e.event === events.start) return e
  return e.kind === respond.kinds.navigation ? e : curr
}

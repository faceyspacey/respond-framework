export const markPop = (state, e) => {
  const pop = state.respond.history.state.pop
  if (pop) e.meta.pop = pop
}
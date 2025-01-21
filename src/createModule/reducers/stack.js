import { navigation } from '../kinds.js'


export default function (state = { entries: [], index: -1 }, e, { respond }) {
  if (e.kind !== navigation) return state
  if (e.meta.parallel) return state
  
  const { entries, index: i } = state

  if      (respond.isEqualNavigations(e, entries[i])) {      // current event repeated

  }
  else if (respond.isEqualNavigations(e, entries[i - 1])) {  // back
    state.index = Math.max(i - 1, 0)
  }
  else if (respond.isEqualNavigations(e, entries[i + 1])) {  // next
    state.index = i + 1
  }
  else {
    entries.splice(i + 1, entries.length, e)                  // push -- delete stale tail like browser history.push
    state.index = entries.length - 1
  }

  return state
}
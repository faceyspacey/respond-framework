import { navigation } from '../kinds.js'


export default function (stack = { entries: [], index: -1 }, e) {
  if (e.kind !== navigation) return stack

  const { entries, index } = stack
  if (index === -1) return { entries: [e], index: 0 }

  if (this.respond.isEqualNavigations(e, entries[index])) {
    return stack
  }

  if (this.respond.isEqualNavigations(e, entries[index - 1])) {
    return { ...stack, index: index - 1 }
  }

  if (this.respond.isEqualNavigations(e, entries[index + 1])) {
    return { ...stack, index: index + 1 }
  }

  const push = index < entries.length - 1 // if not at end, clip tail as in standard stack.push operation
  const next = push ? entries.slice(0, index + 1) : entries

  return { entries: [...next, e], index: index + 1}
}
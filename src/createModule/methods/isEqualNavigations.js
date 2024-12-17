import { navigation } from '../kinds.js'


export default function(a, b) {
  if (!a || !b) return false
  if (a.event !== b.event) return false
  if (a.kind !== navigation) return false
  if (b.kind !== navigation) return false
  if (!a.event.pattern || !a.event.pattern) return false

  return this.fromEvent(a).url === this.fromEvent(b).url
}
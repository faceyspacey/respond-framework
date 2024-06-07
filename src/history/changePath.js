import { shouldChange } from './utils/state.js'
import change from './utils/change.js'
import { createTrap } from './createTrap.js'
import bs from './browserState.js'


export default async e => {
  if (!shouldChange(e)) return
  
  const { fromEvent, ctx } = window.store
  const { url } = fromEvent(e)

  change(url, bs.pop || ctx.changedPath)

  ctx.changedPath = true
  
  createTrap()
}
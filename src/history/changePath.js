import { shouldChange } from './utils/helpers.js'
import change from './utils/change.js'
import { createTrap } from './createTrap.js'


export default async e => {
  if (!shouldChange(e)) return
  
  const { fromEvent, ctx } = window.store
  const { url } = fromEvent(e)

  change(url, ctx.changedPath)

  ctx.changedPath = true
  
  createTrap()
}
import { shouldChange } from './utils/helpers.js'
import change from './utils/change.js'
import { createTrap } from './createTrap.js'


export default async e => {
  if (!shouldChange(e)) return
  
  const { respond, ctx } = window.store
  const { url } = respond.fromEvent(e)

  change(url, ctx.changedPath)

  ctx.changedPath = true
  ctx.prevUrl = url

  createTrap()
}
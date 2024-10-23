import change from './utils/change.js'
import { createTrap } from './createTrap.js'


export default async (e, redirect) => {
  const { respond, ctx } = window.store
  if (ctx.isReplay || e?.changePath === false) return
  
  const url = respond.fromEvent(e).relativeUrl

  change(url, ctx.changedPath || redirect)

  ctx.changedPath = true
  ctx.prevUrl = url

  createTrap()
}
import { isTest } from './bools.js'
import timeout from './timeout.js'


export default async store => {
  const { replays, ctx } = store.respond
  const { latency } = replays.settings

  const dontAwait = !latency || ctx.isFastReplay || isTest
  if (dontAwait) return

  await timeout(latency)
}
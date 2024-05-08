import timeout from './timeout.js'


export default async db => {
  const { latency } = db.store.replays.settings
  const dontAwait = !latency || window.isFastReplay || process.env.NODE_ENV === 'test'
  if (dontAwait) return
  await timeout(latency)
}
import timeout from './timeout.js'


export default async store => {
  const { latency } = store.replays.settings
  const dontAwait = !latency || window.isFastReplay || process.env.NODE_ENV === 'test'
  if (dontAwait) return
  await timeout(latency)
}
import { isTest } from '../helpers/constants.js'


export default (ms = 300) => {
  const dontAwait = window.state?.replayTools?.playing || isTest
  if (dontAwait) return
  return new Promise(res => setTimeout(res, ms))
}
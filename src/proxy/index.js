
import { getUntracked, markToTrack } from './proxy-compare.js'
import sliceByModulePath from '../utils/sliceByModulePath.js'
import createSetHandler from './utils/createHandler.js'


export function proxy(initialObject = {}, modulePaths = {}, selectors = {}) {
  const proxyCache = new WeakMap()
  const snapCache = new WeakMap()

  const versionHolder = [1, 1]

  const createSnapshot = createCreateSnapshot()
  const proxyFunction = createProxyFunction()

  return proxyFunction(initialObject, modulePaths, selectors)
}
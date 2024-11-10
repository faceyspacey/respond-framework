import error from './plugins/error.js'
import loadTests from './plugins/loadTests.js'
import defaultPlugins from '../../plugins.js'
import { _parent } from '../../store/reserved.js'

export { id } from './respond.js'

export { default as events } from './events.js'

export * as reducers from './reducers.js'

export const plugins = [error, loadTests, ...defaultPlugins]

export const ignoreParents = true

export const evs = []

export const evsIndex = -1

export const divergentIndex = undefined

export const errors = {}

export { default as replayEvents } from '../../replays/replayEvents.js'

export function findLastEvent() {
  return this.evs[this.evsIndex]
}

export function testsParams() {
  const { focusedModulePath, searched, filter } = this
  return { focusedModulePath, searched, filter }
}

export function topState() {
  return this[_parent]
}
import error from './plugins/error.js'
import loadTests from './plugins/loadTests.js'
import defaultPlugins from '../../plugins.js'
import { _parent } from '../../createModule/reserved.js'

export { default as build } from './build.js'

export { default as replayEvents } from './replayEvents.js'

export { default as db } from './db.js'

export { default as events } from './events.js'

export { id } from './respond.js'

export * as reducers from './reducers.js'

export const plugins = [error, loadTests, ...defaultPlugins]

export const ignoreParents = true

export const evs = []

export const evsIndex = -1

export const divergentIndex = undefined

export const errors = {}

export function findLastEvent() {
  return this.evs[this.evsIndex]
}

export function testsParams() {
  const { focusedBranch: branch, searched, filter } = this
  return { branch, searched, filter }
}

export function topState() {
  return this[_parent]
}
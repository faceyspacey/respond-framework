import { addToCache } from '../../utils/addToCache.js'
import sliceByModulePath from '../../utils/sliceByModulePath.js'
import { createPathOptions } from './helpers/createOptions.js'
import resolveModulePath from './helpers/resolveModulePath.js'


export const open = (state, e, { events }) => {
  switch (e.event) {
    case events.settings:
    case events.tests:
    case events.events:
    case events.test:
      return true
  }

  return state
}


export const tab = (state, e, { events }) => {
  switch (e.event) {
    case events.settings:
      return 'settings'
      
    case events.tests:
      return 'tests'

    case events.events:
    case events.test:
      return 'events'
  }
  
  return state
}


export const loading = (_, e, { state }) => {
  if (state.testsList?.length > 0) return false
  return !!e.event.fetch
}


export const form = (state, e, store) => {
  if (!e.form) return state

  if (e.form.module === undefined) return { ...state, ...e.form } // edit settings form

  const modulePath = e.form.module
  const slicedEvents = sliceByModulePath(store.getStore().eventsAll, modulePath)

  const options = createPathOptions(slicedEvents, modulePath, store)
  const path = options[0]?.value || '/' // also set form.path value to first option when changing modules

  return { ...state, ...e.form, path }
}


export const tests = (state = {}, e, { events, replays }) => {
  switch (e.event) {
    case events.deleteTest.done: {
      delete state[e.id]
      return state
    }
  }

  if (e.tests) {
    const tests = e.tests.map(t => ({
      ...t,
      events: t.events.map(e => resolveModulePath(e, t.modulePath, replays.settings.modulePath))
    }))

    return addToCache(state, tests)
  }

  return state
}


export const testsList = (state = [], e, { events, state: st }) => {
  switch (e.event) {
    case events.sortTests.done:
    case events.includeChildModuleTests.done:
    case events.filterTests.done:
    case events.tests.done: {
      const ids = e.tests.map(t => t.id)

      return st.sort === 'recent' || e.meta.from?.sort === 'recent'
        ? ids.sort((a, b) => st.tests[b].updatedAt - st.tests[a].updatedAt)
        : ids.sort((a, b) => a.localeCompare(b))
    }

    case events.deleteTest.done:
      return state.filter(id => id !== e.meta.from.id)
  }

  return state
}


export const searched = (state = '', e, { events }) => e.event === events.filterTests ? e.searched : state


export const sort = (state = 'az', e, { events }) => {
  switch (e.event) {
    case events.tests:
    case events.sortTests:
      return e.sort || state
  }

  return state
}


export const includeChildren = (state = false, e, { events }) => {
  switch (e.event) {
    case events.includeChildModuleTests:
      return !state
  }

  return state
}


export const filter = (state = 'tests', e, { events }) => {
  switch (e.event) {
    case events.toggleFilter:
      return state === 'tests' ? 'snaps' : 'tests'
  }

  return state
}
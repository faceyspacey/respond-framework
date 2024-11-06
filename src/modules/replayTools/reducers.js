import createSettings from '../../replays/utils/createSettings.js'
import { addToCache } from '../../utils/addToCache.js'
import sliceByModulePath from '../../utils/sliceByModulePath.js'
import events from './events.js'
import resolveModulePath from './helpers/resolveModulePath.js'


export const open = (state = false, e, { events }) => {
  switch (e.event) {
    case events.toggle:
      return !state
      
    case events.settings:
    case events.tests:
    case events.events:
    case events.test:
      return true
  }

  return state
}

export const tab = (state = 'settings', e, { events }) => {
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




export const form = (state = {}, e, { events, formRespond, respond }) => {
  if (e.event !== events.edit) return state

  Object.assign(state[formRespond.module], e.form)

  cascadeSetting(state, e, formRespond.module, respond)

  return state
}


const cascadeSetting = (state, e, path, respond) => {
  const config = respond.replayConfigs[path]
  const setting = config[e.meta.name]

  if (setting.grant === false) return

  const denied = []

  Object.keys(state)
    .sort((a, b) => a.split('.').length - b.split('.').length) // sort by ancestors first
    .forEach(p => {
      const isDescendent = p.indexOf(path) === 0 && p !== path
      if (!isDescendent) return

      const config = respond.replayConfigs[p]
      const setting = config[e.meta.name]

      if (!setting) return

      if (setting.accept === false) return denied.push(p)
      if (denied.find(p2 => p2.indexOf(p) === 0)) return

      Object.assign(state[p], e.form)
    })
}




export const formRespond = (state = {}, e, { events, topState, tests }) => {
  if (e.event === events.init) {
    return { ...state, module: topState.replaySettings.module ?? '' }
  }

  if (e.event === events.test) {
    const { module } = tests[e.id].settings
    return { ...state, module }
  }

  if (e.event !== events.editRespond) return state

  return { ...state, ...e.form }
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
      events: t.events.map(e => resolveModulePath(e, t.modulePath, replays.settings.module))
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
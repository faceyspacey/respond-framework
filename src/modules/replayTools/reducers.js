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


// export const form = (state = {}, e, { events, topState, formRespond }) => {
//   if (e.event === events.init) {
//     const settingsTree = (s, form, k) => {
//       if (k === 'replayTools') return
//       Object.assign(form, s.respond.replays.settings)
//       s.moduleKeys.forEach(k => settingsTree(s[k], form[k] = {}, k))
//     }
  
//     settingsTree(topState, state)

//     return state
//   }

//   if (e.event !== events.edit) return state

//   const path = formRespond.module

//   if (!path) {
//     Object.assign(state, e.form)
//   }
//   else {
//     let mod = state
//     path.split('.').forEach(k => mod = mod[k] ??= {})
//     Object.assign(mod, e.form)
//   }

//   return state
// }

export const form = (state = {}, e, { events, formRespond, respond }) => {
  // if (e.event === events.init) {
  //   const settingsTree = (mod, k) => {
  //     if (k === 'replayTools') return
  //     state[mod.modulePath] = mod.replays.settings
  //     s.moduleKeys.forEach(k => settingsTree(mod[k], k))
  //   }
  
  //   settingsTree(topModule)

  //   return state
  // }

  // if (e.event === events.editRespond && !state[formRespond.module]) {
  //   const path = formRespond.module

  //   const mod = sliceByModulePath(topModule, path)
  //   const settings = createSettings(mod.replays.config)

  //   Object.assign(state[path] = {}, settings)
  // }

  if (e.event === events.edit) {
    const path = formRespond.module

    Object.assign(state[path] ??= {}, e.form)

    const config = respond.replayConfigs[path]
    const setting = config[e.meta.name]

    if (setting.grant) {
      Object.keys(state).forEach(path2 => {
        const isDescendent = path2.indexOf(path) === 0 && path2 !== path
        if (!isDescendent) return

        const config = respond.replayConfigs[path2]
        const setting = config[e.meta.name]

        if (setting && !setting.deny) {
          Object.assign(state[path2] ??= {}, e.form)
        }
      })
    }
  }


  return state
}


export const formRespond = (state = {}, e, { events, topState }) => {
  if (e.event === events.init) {
    return { ...state, module: topState.replaySettings.module ?? '' }
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
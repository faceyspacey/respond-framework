import { Linking } from 'react-native'
import combineInputEvents from '../../devtools/utils/combineInputEvents.js'
import createPermalink from './helpers/createPermalink.js'
import createState from '../../store/createState.js'
import { kinds } from '../../utils.js'

import nestSettings from './helpers/nestSettings.js'
import sliceByModulePath from '../../utils/sliceByModulePath.js'
import { findClosestAncestorWithObjectContaining, findClosestAncestorWith } from '../../utils/findInClosestAncestor.js'
import { defaultOrigin } from '../../utils/constants.js'


export default {
  toggle: {},

  editConfig: {
    sync: true,
    transform: ({}, form) => ({ form }),
  },

  changeModulePath: {
    submit: ({ db, state }) => {
      if (state.tab !== 'tests') return false
      return db.developer.findTests(state.testsParams)
    }
  },

  settings: {
    namespace: false,
    kind: kinds.navigation,
  },

  events: {
    namespace: false,
    kind: kinds.navigation,
  },

  tests: {
    namespace: false,
    kind: kinds.navigation,
    cache: false,
    fetch: ({ db, state }) => db.developer.findTests(state.testsParams),
  },
  
  sortTests: {
    submit: ({ db, state }) => db.developer.findTests(state.testsParams)
  },

  toggleFilter: {
    submit: ({ db, state }) => db.developer.findTests(state.testsParams)
  },

  searchTests: {
    sync: true,
    debounce: ({ db, state }) => db.developer.findTests(state.testsParams),
  },

  testFromWallaby: {
    before: async ({ respond, state, events }, { test, index, delay }) => {
      const topState = respond.getStore()
      const { focusedModulePath } = topState.replayState

      if (test.branch.indexOf(focusedModulePath) !== 0) { // ensure test will run in its original module or a parent module
        topState.replayState.focusedModulePath = test.branch
        state.focusedModulePath = test.branch
      }
      
      return events.test({ tests: [test], id: test.id, index, delay }) // add tests to state.tests reducer + trigger replay
    },
  },

  test: {
    kind: kinds.navigation,
    submit: async (state, { id, index, delay }) => {
      const { settings, events: evs, name } = state.tests[id]

      state.evs = evs
      state.divergentIndex = evs.length // purple event rows will appear at end of event list if new events manually triggered by using app
    
      state.selectedTestId = id
      state.selectedTestName = name

      const events = index === undefined ? evs : evs.slice(0, index + 1)

      await state.replayEvents(events, delay, settings, state.focusedModulePath)

      return false
    },
  },

  saveTest: {
    submit: async ({ state, db, topState, events: { tests } }) => {
      state.selectedTestName ??= state.evs[0].type.replace(/\./g, '/') + '.js'
      
      const name = prompt('Name of your test?', state.selectedTestName)?.replace(/^\//, '')
      if (!name) return

      const { settings, focusedModulePath: branch } = topState.replayState // settings is already nested correctly during `reload`, and settings form might have been edited but not reloaded, which is why we use the original replayState
      const events = combineInputEvents(state.evs.filter(e => !e.meta?.skipped))

      await db.developer.writeTestFile({ name, branch, settings, events })
      await tests.dispatch({ sort: 'recent' })
    }
  },

  deleteTest: {
    submit: ({ db, state }, { id }) => {
      const yes = confirm('Are you sure you want to delete test ' + id)
      if (!yes) return false

      const { filename } = state.tests[id]
      return db.developer.deleteTestFile(filename)
    }
  },

  runTestInTerminal: {
    submit: ({ db }, { id }) => {
      return db.developer.runTestInTerminal(id)
    }
  },

  stopReplay: {
    before: state => state.playing = false
  },

  replayEventsToIndex: {
    before: async (state, { index, delay }) => {
      const events = state.evs.slice(0, index + 1)
      await state.replayEvents(events, delay)
      return false
    }
  },

  changeIndex: {
    before: async (state, { index, delta }) => {
      const lastIndex = state.evs.length - 1
      const nextIndex = Math.max(0, Math.min(lastIndex, index + delta))

      const events = state.evs.map(e => ({ ...e, dragId: uniqueDragId() })) // trigger react to re-render all event rows correctly
      const event = events[index]

      events.splice(index, 1)             // delete event in original position
      events.splice(nextIndex, 0, event)  // move event to new index

      state.evs = events
      state.divergentIndex = Math.min(index, nextIndex)

      const eventsToIndex = events.slice(0, state.evsIndex + 1)
      
      await state.replayEvents(eventsToIndex)

      return false
    }
  },

  skipEvent: {
    before: async (state, { index }) => {
      const e = state.evs[index]
      const skipped = !e.meta?.skipped

      e.meta = { ...e.meta, skipped }

      const end = state.evsIndex + 1
      const events = state.evs.slice(0, end)

      await state.replayEvents(events)

      return false
    }
  },

  deleteEvent: {
    before: async ({ state }, { index: i }) => {
      state.evs.splice(i, 1)

      if (state.divergentIndex && i < state.divergentIndex) {
        state.divergentIndex--
      }

      const events = state.evs.slice(0, i)
      await state.replayEvents(events)

      return false
    }
  },

  togglePersist: {
    before: async state => {
      state.persist = !state.persist
      return false
    }
  },

  reload: {
    before: async ({ settings, config, focusedModulePath, top, errors }) => {
      settings = gatherAllSettings(settings, focusedModulePath, top)
      const { url = '/' } = config
      
      const prev = window.state
      const { eventsByType } = prev.respond
      prev.respond.eventsByType = {} // eventsByType is reused from previous state -- since modules could change, it's possible that the same type will exist in different modules but not be the same event due to namespaces -- so we don't use eventsByType to preserve references in this case, as we do with HMR + replays

      const start = new Date
      const state = createState(top, { settings, focusedModulePath, status: 'reload' })
      console.log('reload.createModule', new Date - start)

      const e = state.eventFrom(url)

      if (e) {
        const start = new Date
        state.replayTools.playing = true // trigger timeouts not to work like replayEvents
        await e.trigger()
        state.replayTools.playing = false
        state.render()
        console.log('reload.trigger/render!', new Date - start)
      }
      else {
        window.state = prev
        prev.respond.eventsByType = eventsByType
        errors.url = `no event for url "${url}" in module`
      }

      return false
    }
  },


  removeError: {
    sync: true,
    reduce: ({ errors }, { name }) => delete errors[name]
  },

  openPermalink: {
    before: async ({ settings, focusedModulePath, top, config }) => {
      settings = gatherAllSettings(settings, focusedModulePath, top)
      const hash = createPermalink(settings, focusedModulePath)

      const baseUrl = config.url || '/'
      
      const relativeUrl = baseUrl + hash
      const url = defaultOrigin + relativeUrl

      console.log('Your permalink is:\n', url)
      alert(`Your permalink is:\n\n${relativeUrl}\n\nYou can copy paste it from the console.You will be redirected now.`)

      Linking.openURL(url)

      return false
    },
  },
}

let id = 0
const uniqueDragId = () => ++id + ''



const gatherAllSettings = (settings, branch, top) => {
  const nestedSettings = nestSettings(settings)

  const mod = sliceByModulePath(top, branch)
  const hasDb = mod.db || mod.replays?.standalone

  if (hasDb) {
    settings = sliceByModulePath(nestedSettings, branch) ?? {} // undefined could happen if all settings undefined
  }
  else {
    branch = findClosestAncestorWith('db', branch, top)?.branch ?? ''
    settings = sliceByModulePath(nestedSettings, branch) ?? {}
    settings.module = branch
  }

  return settings
}
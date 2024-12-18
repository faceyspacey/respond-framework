import { Linking } from 'react-native'
import combineInputEvents from './helpers/combineInputEvents.js'
import createPermalink from './helpers/createPermalink.js'
import createModule from '../../createModule/index.js'
import { navigation } from '../../createModule/kinds.js'

import nestSettings from './helpers/nestSettings.js'
import sliceBranch from '../../createModule/helpers/sliceBranch.js'
import findClosestAncestorWith from '../../createModule/helpers/findClosestAncestorWith.js'
import { defaultOrigin } from '../../helpers/constants.js'


export default {
  toggle: {},

  editConfig: {
    sync: true,
    transform: ({}, form) => ({ form }),
  },

  changeBranch: {
    submit: ({ db, tab, testsParams }) => {
      if (tab !== 'tests') return false
      return db.developer.findTests.server(testsParams)
    }
  },

  settings: {
    namespace: false,
    kind: navigation,
  },

  events: {
    namespace: false,
    kind: navigation,
  },

  tests: {
    namespace: false,
    kind: navigation,
    cache: false,
    fetch: ({ db, testsParams }) => db.developer.findTests.server(testsParams),
  },
  
  sortTests: {
    submit: ({ db, testsParams }) => db.developer.findTests.server(testsParams)
  },

  toggleFilter: {
    submit: ({ db, testsParams }) => db.developer.findTests.server(testsParams)
  },

  searchTests: {
    sync: true,
    debounce: ({ db, testsParams }) => db.developer.findTests.server(testsParams),
  },

  testFromWallaby: {
    before: async ({ events }, { test, index, delay }) => events.test({ tests: [test], id: test.id, index, delay }) // add tests to state.tests reducer + trigger replay
  },

  test: {
    kind: navigation,
    submit: async (state, { id, index, delay }) => {
      const { events, name, ...test } = state.tests[id]

      state.evs = events.slice()
      state.divergentIndex = events.length // purple event rows will appear at end of event list if new events manually triggered by using app
    
      state.selectedTestId = id
      state.selectedTestName = name

      const evs = index === undefined ? events : events.slice(0, index + 1)

      await state.replayEvents(evs, delay, test)

      return false
    },
  },

  saveTest: {
    async submit({ db, respond, events: { tests } }) {
      this.selectedTestName ??= this.evs[0].type.replace(/\./g, '/') + '.js'
      
      const name = prompt('Name of your test?', this.selectedTestName)?.replace(/^\//, '')
      if (!name) return

      const { settings, branch } = respond.replayState // settings is already nested correctly during `reload`, and settings form might have been edited but not reloaded, which is why we use the original replayState
      const events = combineInputEvents(this.evs.filter(e => !e.meta?.skipped))

      await db.developer.writeTestFile.server({ name, branch, settings, events })
      await tests.dispatch({ sort: 'recent' })
    }
  },

  deleteTest: {
    submit: ({ db, tests }, { id }) => {
      const yes = confirm('Are you sure you want to delete test ' + id)
      if (!yes) return false

      const { filename } = tests[id]
      return db.developer.deleteTestFile.server(filename)
    }
  },

  runTestInTerminal: {
    submit: ({ db }, { id }) => {
      return db.developer.runTestInTerminal.server(id)
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
    before: async (state, { index: i }) => {
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
    before: async ({ settings, config, focusedBranch: branch, respond, errors }) => {
      settings = gatherAllSettings(settings, branch, respond)
      const { url = '/' } = config
      
      const resp = createModule(respond.top, { settings, branch, status: 'reload' })
      const e = resp.eventFrom(url)

      if (e) {
        resp.state.replayTools.playing = true // trigger timeouts not to work like replayEvents
        await e.trigger()
        resp.state.replayTools.playing = false
        resp.render()
        resp.queueSaveSession()
      }
      else {
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
    before: async ({ settings, focusedBranch, respond, config }) => {
      settings = gatherAllSettings(settings, focusedBranch, respond)
      const hash = createPermalink(settings, focusedBranch)

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



const gatherAllSettings = (settings, branch, respond) => {
  const nestedSettings = nestSettings(settings)

  const mod = sliceBranch(respond.top, branch)
  const hasDb = mod.db || mod.replays?.standalone

  if (hasDb) {
    settings = sliceBranch(nestedSettings, branch) ?? {} // undefined could happen if all settings undefined
  }
  else {
    branch = findClosestAncestorWith('db', branch, respond)?.branchAbsolute ?? ''
    settings = sliceBranch(nestedSettings, branch) ?? {}
    settings.branch = branch
  }

  return settings
}
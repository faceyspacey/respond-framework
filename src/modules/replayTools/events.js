import { Linking } from 'react-native'
import ignoreDefaultSettings from './helpers/ignoreDefaultSettings.js'
import combineInputEvents from '../../devtools/utils/combineInputEvents.js'
import createPermalink from './helpers/createPermalink.js'
import createState from '../../store/createState.js'
import { kinds } from '../../utils.js'


export default {
  toggle: {},

  editRespond: {
    sync: true,
    transform: ({}, form) => ({ form }),
  },

  changeModulePath: {},

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
    fetch: ({ db, state }) => db.developer.findTests(state.focusedModulePath, state.includeChildren, state.searched, state.filter),
  },
  
  sortTests: {
    submit: ({ db, state }) => db.developer.findTests(state.focusedModulePath, state.includeChildren, state.searched, state.filter)
  },

  includeChildModuleTests: {
    submit: ({ db, state }) => db.developer.findTests(state.focusedModulePath, state.includeChildren, state.searched, state.filter)
  },

  toggleFilter: {
    submit: ({ events, state }) => events.filterTests({ searched: state.searched })
  },

  filterTests: {
    sync: true,
    debounce: ({ db, state }, e) => db.developer.findTests(state.focusedModulePath, state.includeChildren, e.searched, state.filter),
  },

  testFromWallaby: {
    before: async ({ replays, state, events }, { test, index, delay }) => {
      if (test.modulePath.indexOf(replays.settings.module) !== 0) { // ensure test will run in its original module or a parent module
        replays.settings.module = test.modulePath
        state.focusedModulePath = test.modulePath
      }
      
      return events.test({ tests: [test], id: test.id, index, delay }) // add tests to state.tests reducer + trigger replay
    },
  },

  test: {
    kind: kinds.navigation,
    submit: async (state, { id, index, delay }) => {
      const { settings, events: evs } = state.tests[id]

      state.evs = evs

      state.divergentIndex = evs.length // purple event rows will appear at end of event list if new events manually triggered by using app
      state.selectedTestId = id

      index = index === undefined ? evs.length - 1 : index
      const events = evs.slice(0, index + 1)

      await state.replays.replayEvents(events, delay, { settings, focusedModulePath: state.focusedModulePath })

      return false
    },
  },

  saveTest: {
    submit: async ({ state, db, events }) => {
      const first = state.evs[0]
      const possibleName = state.selectedTestId || first.type.replace(/\./g, '/') + '.js'
      
      const name = prompt('Name of your test?', possibleName)

      if (name) {
        const settings = state.form
        const modulePath = state.focusedModulePath

        const evs = combineInputEvents(state.evs.filter(e => !e.meta?.skipped))

        const res = await db.developer.writeTestFile({ name, modulePath, settings, events: evs })
        await events.tests.dispatch({ sort: 'recent' })

        return res
      }
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
      await state.replays.replayEvents(events, delay)
      return false
    }
  },

  changeIndex: {
    before: async (state, { index, delta }) => {
      const lastIndex = state.evs.length - 1
      const nextIndex = Math.max(0, Math.min(lastIndex, index + delta))

      const events = state.evs.map(e => ({ ...e, dragId: uniqueId() })) // trigger react to re-render all event rows correctly
      const event = events[index]

      events.splice(index, 1)             // delete event in original position
      events.splice(nextIndex, 0, event)  // move event to new index

      state.evs = events
      state.divergentIndex = Math.min(index, nextIndex)

      const eventsToIndex = events.slice(0, state.evsIndex + 1)
      
      await state.replays.replayEvents(eventsToIndex)

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

      await state.replays.replayEvents(events)

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
      await state.replays.replayEvents(events)

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
    before: async ({ form: settings, formRespond, focusedModulePath, top, errors }) => {
      const { url = '' } = formRespond

      const prev = window.state
      const { eventsByType } = prev
      prev.eventsByType = {} // eventsByType is reused from previous store -- since modules could change, it's possible that the same type will exist in different modules but not be the same event due to namespaces -- so we don't use eventsByType to preserve references in this case, as we do with HMR + replays

      const state = createState(top, { settings, focusedModulePath, status: 'reload' })
      const e = state.eventFrom(url)

      if (e) {
        await e.trigger()
        state.render()
      }
      else {
        window.state = prev
        window.state.eventsByType = eventsByType
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
    before: async state => {
      const { url, relativeUrl } = createPermalink(state)

      console.log('Your permalink is:\n', url)
      alert(`Your permalink is:\n\n${relativeUrl}\n\nYou can copy paste it from the console.You will be redirected now.`)

      Linking.openURL(url)

      return false
    },
  },
}

let id = 0
const uniqueId = () => ++id + ''
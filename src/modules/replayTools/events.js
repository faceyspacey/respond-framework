import { Linking } from 'react-native'
import ignoreDefaultSettings from './helpers/ignoreDefaultSettings.js'
import combineInputEvents from '../../devtools/utils/combineInputEvents.js'
import createPermaLink from './helpers/createPermaLink.js'
import createStore from '../../store/createStore.js'
import sessionStorage from '../../utils/sessionStorage.js'
import localStorage from '../../utils/localStorage.js'
import copyToClipboard from '../../utils/copyToClipboard.js'


export default {
  toggle: {
    before: ({ state }) => {
      state.open = !state.open
    }
  },

  settings: {
    namespace: false,
    navigation: true,
    end: () => localStorage.setItem('replayToolsTab', 'settings')
  },

  events: {
    namespace: false,
    navigation: true,
    end: () => localStorage.setItem('replayToolsTab', 'events')
  },

  tests: {
    namespace: false,
    navigation: true,
    cache: false,
    fetch: ({ db, replays, state }) => db.developer.findTests(replays.settings.module, state.includeChildren, state.searched, state.filter),
    end: () => localStorage.setItem('replayToolsTab', 'tests')
  },
  
  sortTests: {
    submit: ({ db, replays, state }) => db.developer.findTests(replays.settings.module, state.includeChildren, state.searched, state.filter)
  },

  includeChildModuleTests: {
    submit: ({ db, replays, state }) => db.developer.findTests(replays.settings.module, state.includeChildren, state.searched, state.filter)
  },

  toggleFilter: {
    submit: ({ events, state }) => events.filterTests({ searched: state.searched })
  },

  filterTests: {
    sync: true,
    debounce: ({ db, replays, state }, e) => db.developer.findTests(replays.settings.module, state.includeChildren, e.searched, state.filter),
  },

  testFromWallaby: {
    before: async ({ replays, state, events }, { test, index, delay }) => {
      if (test.modulePath.indexOf(replays.settings.module) !== 0) { // ensure test will run in its original module or a parent module
        replays.settings.module = test.modulePath
        state.form.module = test.modulePath
      }
      
      return events.test({ tests: [test], id: test.id, index, delay }) // add tests to state.tests reducer + trigger replay
    },
  },

  test: {
    navigation: true,
    submit: async (store, { id, index, delay }) => {
      const { state, replays } = store

      const { settings, events: evs } = state.tests[id]

      state.evs = evs // display all events before replayed

      state.divergentIndex = evs.length // purple event rows will appear at end of event list if new events manually triggered by using app
      state.selectedTestId = id

      index = index === undefined ? evs.length - 1 : index
      const events = evs.slice(0, index + 1)

      await localStorage.setItem('replayToolsTab', 'events')
      await replays.replayEvents(events, delay, settings)

      return false
    },
  },

  saveTest: {
    submit: async ({ state, replays, db, events }) => {
      const first = state.evs[0]
      const possibleName = state.selectedTestId || first.type.replace(/\./g, '/') + '.js'
      
      const name = prompt('Name of your test?', possibleName)

      if (name) {
        const modulePath = replays.settings.module
        const settings = ignoreDefaultSettings(replays.config, { ...replays.settings })

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
    before: ({ replays, state }) => {
      replays.playing = false
      state.playing = false
      return false
    }
  },

  replayEventsToIndex: {
    before: async (store, { index, delay }) => {
      const { state, replays } = store
      const events = state.evs.slice(0, index + 1)

      await replays.replayEvents(events, delay)

      return false
    }
  },

  changeIndex: {
    before: async (store, { index, delta }) => {
      const { state, replays } = store

      const lastIndex = state.evs.length - 1
      const nextIndex = Math.max(0, Math.min(lastIndex, index + delta))

      const events = state.evs.map(e => ({ ...e, dragId: uniqueId() })) // trigger react to re-render all event rows correctly
      const event = events[index]

      events.splice(index, 1)             // delete event in original position
      events.splice(nextIndex, 0, event)  // move event to new index

      state.evs = events
      state.divergentIndex = Math.min(index, nextIndex)

      const eventsToIndex = events.slice(0, state.evsIndex + 1)
      
      await replays.replayEvents(eventsToIndex)

      return false
    }
  },

  skipEvent: {
    before: async (store, { index }) => {
      const { state, replays } = store

      const e = state.evs[index]
      const skipped = !e.meta?.skipped

      e.meta = { ...e.meta, skipped }

      const end = state.evsIndex + 1
      const events = state.evs.slice(0, end)

      await replays.replayEvents(events)

      return false
    }
  },

  deleteEvent: {
    submit: ({ state, events }, { index: i }) => {
      state.evs.splice(i, 1)

      if (state.divergentIndex && i < state.divergentIndex) {
        state.divergentIndex--
      }

      const index = state.evsIndex - 1
      return events.replayEventsToIndex({ index })
    }
  },

  togglePersist: {
    before: async state => {
      state.persist = !state.persist
      
      if (state.persist) {
        const json = state.stringifyState(state)
        await sessionStorage.setItem('replayToolsState', json)
      }
      else { 
        await sessionStorage.removeItem('replayToolsState')
      }

      return false
    }
  },

  reload: {
    before: async ({ state, top }) => {
      const { permalink: _, ...settings } = state.form

      await localStorage.setItem('replaySettings', JSON.stringify(settings))
      window.history.replaceState(history.state, '', settings.path)

      window.store.eventsByType = {}

      const store = await createStore(top, { settings })

      const e = store.eventFrom(settings.path)
      await store.dispatch(e)
      
      store.render()

      store.state.replayTools.persist = state.persist

      return false
    }
  },

  openPermaLink: {
    before: async ({ state, replays }, { arg }) => {
      const url = createPermaLink(state, replays, arg)

      Linking.openURL(url)
      copyToClipboard(url)

      console.log('Your permalink is:\n', url)
      console.log(`It's been copied to your clipboard :)`)

      alert(`Check the console for a permalink you can copy & paste.`)

      return false
    },
  },
}

let id = 0
const uniqueId = () => ++id + ''
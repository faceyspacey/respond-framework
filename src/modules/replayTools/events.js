import { Linking } from 'react-native'
import combineInputEvents from './helpers/combineInputEvents.js'
import createPermalink from './helpers/createPermalink.js'
import createModule from '../../createModule/index.js'
import { navigation } from '../../createModule/kinds.js'
import { nestFocusedSettings } from './helpers/nestSettings.js'
import { defaultOrigin } from '../../helpers/constants.js'


export default {
  toggle: {},

  editConfig: {
    sync: true,
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
    run: ({ events }, { test, index, delay }) => events.test({ tests: [test], id: test.id, index, delay }) // add tests to state.tests reducer + trigger replay
  },

  test: {
    kind: navigation,
    tap: (state, { id, index, delay }) => {
      const { events, name, ...test } = state.tests[id]

      state.divergentIndex = events.length // purple event rows will appear at end of event list if new events manually triggered by using app
      state.selectedTestId = id

      return state.replayEvents(events, index, delay, test)
    },
  },

  saveTest: {
    async run({ db, respond, selectedTestId, evs, tests: t, events: { tests } }) {
      const defaultName = selectedTestId ? t[selectedTestId].name : evs[0].event.type.replace(/\./g, '/') + '.js'
      const name = prompt('Name of your test?', defaultName)?.replace(/^\//, '')

      if (!name) return

      const { settings, branch } = respond.replayState // settings is already nested correctly during `reload`, and settings form might have been edited but not reloaded, which is why we use the original replayState
      const events = combineInputEvents(evs.filter(e => !e.meta?.skipped))

      await db.developer.writeTestFile.server({ name, branch, settings, events })
      await tests.dispatch({ sort: 'recent' })

      this.selectedTestId = this.testsList[0]
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
    submit: ({ db, tests }, { id }) => {
      const { filename } = tests[id]
      return db.developer.runTestInTerminal.server(filename)
    }
  },

  openTestFile: {
    run: ({ db, tests }, { id }) => {
      const { filename } = tests[id]
      return db.developer.openFile.server(filename)
    }
  },

  stopReplay: {
    reduce: state => state.playing = false
  },

  replayEventsToIndex: {
    run: (state, { index, delay }) => state.replayEvents(state.evs, index, delay)
  },

  changeIndex: {
    counter: 0,
    uniqueDragId() {
      return ++this.counter + ''
    },
    run: (state, { index, delta, event: self }) => {
      const lastIndex = state.evs.length - 1
      const nextIndex = Math.max(0, Math.min(lastIndex, index + delta))

      const events = state.evs.map(e => ({ ...e, dragId: self.uniqueDragId() })) // trigger react to re-render all event rows correctly
      const event = events[index]

      events.splice(index, 1)             // delete event in original position
      events.splice(nextIndex, 0, event)  // move event to new index

      state.divergentIndex = Math.min(index, nextIndex)
 
      return state.replayEvents(events, state.evsIndex)
    }
  },

  skipEvent: {
    run: (state, { index }) => {
      const e = state.evs[index]
      const skipped = !e.meta?.skipped

      e.meta = { ...e.meta, skipped }

      return state.replayEvents(state.evs, state.evsIndex)
    }
  },

  deleteEvent: {
    run: (state, { index: i }) => {
      state.evs.splice(i, 1)

      if (i < state.evs.length - 1) {
        state.divergentIndex = state.divergentIndex ? Math.min(state.divergentIndex, i) : i
      }
      else delete state.divergentIndex

      if (i > state.evsIndex) return false

      return state.replayEvents(state.evs, state.evsIndex - 1)
    }
  },

  toggleSpliceMode: {
    reduce: state => state.spliceMode = !state.spliceMode
  },

  reload: {
    run: async ({ configs, settings, config, focusedBranch: branch, respond }) => {
      settings = nestFocusedSettings(configs, settings, branch, respond)
      const { url = '/' } = config
      
      let resp = createModule(respond.top, { settings, branch, status: 'reload' })
      let e = resp.eventFrom(url)
      
      if (!e) {
        resp = createModule(respond.top, respond.replayState) // revert back to previous state
        e = resp.eventFrom(window.location)
        resp.state.replayTools.errors.url = `no event for url "${url}" in module`
      }

      resp.state.replayTools.playing = true // trigger timeouts not to work like replayEvents
      await e.trigger()
      resp.state.replayTools.playing = false
      resp.render()
      resp.queueSaveSession()
    }
  },


  removeError: {
    reduce: ({ errors }, { name }) => delete errors[name]
  },

  openPermalink: {
    run: ({ configs, settings, focusedBranch, respond, config }) => {
      settings = nestFocusedSettings(configs, settings, focusedBranch, respond)
      const hash = createPermalink(settings, focusedBranch)

      const baseUrl = config.url || '/'
      
      const relativeUrl = baseUrl + hash
      const url = defaultOrigin + relativeUrl

      console.log('Your permalink is:\n', url)
      alert(`Your permalink is:\n\n${relativeUrl}\n\nYou can copy paste it from the console.You will be redirected now.`)

      Linking.openURL(url)
    },
  },
}
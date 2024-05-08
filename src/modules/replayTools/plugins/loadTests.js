export default {
  load: async store => {
    if (store.state.tab === 'tests') {
      await store.events.tests.dispatch()
    }
  }
}
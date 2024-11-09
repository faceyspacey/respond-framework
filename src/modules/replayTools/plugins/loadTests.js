export default {
  load: async state => {
    if (state.tab === 'tests') {
      await state.events.tests.dispatch()
    }
  }
}
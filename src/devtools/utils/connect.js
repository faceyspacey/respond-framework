import orderState from './orderState.js'
import createActionCreators from './createActionCreators.js'
import replacer from './replacer.js'


export default store => {
  if (devtools) return devtools
  const extension = window.__REDUX_DEVTOOLS_EXTENSION__
  
  return devtools = extension.connect({
    name: store.options.devtools?.name || 'Respond Framework',
    actionCreators: createActionCreators(store.events),
    stateSanitizer: state => orderState(state, store, store.topModule),
    shouldCatchErrors: true,
    trace: false,
    traceLimit: 0,
    shouldHotReload: true,
    autoPause: false,
    maxAge: 200,
    features: {
      pause: false, // start/pause recording of dispatched actions
      lock: false, // lock/unlock dispatching actions and side effects
      persist: false, // persist states on page reloading
      export: false, // export history of actions in a file
      import: false, // 'custom', // import history of actions from a file
      jump: true, // jump back and forth (time travelling)
      skip: true, // skip (cancel) actions
      reorder: false, // drag and drop actions in the history list
      dispatch: true, // dispatch custom actions or action creators
      test: false, // generate tests for the selected actions
    },
    serialize: {
      replacer,
      options: {
        function: true,
        date: true,
        regex: true,
        nan: true,
        infinity: true,
        error: true,
        map: true,
        set: true,
        symbol: true,
        undefined: false, // required to hide advanced keys in displayEventFunctionsAsObjects
      }
    }
  })
}


let devtools
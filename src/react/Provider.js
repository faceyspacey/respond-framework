import * as React from 'react'
import RespondContext from './context.js'
import ErrorBoundary from './ErrorBoundary.js'
import ReplayTools from '../modules/replayTools/App/index.js'
import { isProd, isTest } from '../utils/bools.js'

export default ({ store, Error = store.topModule.Error, App = store.topModule.App }) => {
  const hide = isTest || isProd && !store.options.productionReplayTools

  return (
    <RespondContext.Provider value={store}>
      <ErrorBoundary store={store} Error={Error}>
        <App />
        {!hide && <ReplayTools />}
      </ErrorBoundary>
    </RespondContext.Provider>
  )
}
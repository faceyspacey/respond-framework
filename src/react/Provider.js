import * as React from 'react'
import RespondContext from './context.js'
import ErrorBoundary from './ErrorBoundary.js'
import ReplayTools from '../modules/replayTools/App/index.js'
import { isProd, isTest } from '../utils/bools.js'

export default ({ store, Error = store.topModule.components?.Error, App = store.topModule.components?.App }) => {
  const hide = isTest || (isProd && !store.options.productionReplayTools) || store.options.disableReplayTools

  return (
    <RespondContext.Provider value={store}>
      <ErrorBoundary store={store} Error={Error}>
        <App />
      </ErrorBoundary>
      
      {!hide && <ReplayTools />}
    </RespondContext.Provider>
  )
}
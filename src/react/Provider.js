import * as React from 'react'
import RespondContext from './context.js'
import ErrorBoundary from './ErrorBoundary.js'
import ReplayTools from '../modules/replayTools/App/index.js'
import { isProd, isTest } from '../utils/bools.js'

export default ({ state, Error = state.components?.Error, App = state.components?.App }) => {
  const hide = isTest || isProd && !state.respond.options.productionReplayTools

  return (
    <RespondContext.Provider value={state}>
      <ErrorBoundary state={state} Error={Error}>
        <App />
      </ErrorBoundary>
      
      {!hide && <ReplayTools />}
    </RespondContext.Provider>
  )
}
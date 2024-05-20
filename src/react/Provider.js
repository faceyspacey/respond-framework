import * as React from 'react'
import RespondContext from './context.js'
import ErrorBoundary from './ErrorBoundary.js'
import ReplayTools from '../modules/replayTools/App/index.js'
import { isProd } from '../utils/bools.js'

export default ({ store }) =>
  <RespondContext.Provider value={store}>
    <ErrorBoundary store={store}>
      <store.topModule.App />
      {(!isProd || store.options.productionReplayTools) && <ReplayTools />}
    </ErrorBoundary>
  </RespondContext.Provider>
import * as React from 'react'
import RespondContext from './context.js'
import ErrorBoundary from './ErrorBoundary.js'
import ReplayTools from '../modules/replayTools/App/index.js'
import { isDev, isProd, isTest } from '../helpers/constants.js'

export default ({ state, Error, App, ...props }) => {
  Error ??= state.components?.Error
  App ??= state.components?.App

  if (isTest) {
    return (
      <RespondContext.Provider value={state}>
        <App {...props} />
      </RespondContext.Provider>
    )
  }

  if (isDev) {
    return (
      <RespondContext.Provider value={state}>
        <ErrorBoundary state={state} Error={Error}>
          <App {...props} />
          <ReplayTools />
        </ErrorBoundary>
      </RespondContext.Provider>
    )
    
    // return (
    //   <RespondContext.Provider value={state}>
    //     <App {...props} />
    //     <ReplayTools />
    //   </RespondContext.Provider>
    // )
  }

  return (
    <RespondContext.Provider value={state}>
      <ErrorBoundary state={state} Error={Error}>
        <App {...props} />
      </ErrorBoundary>
    </RespondContext.Provider>
  )
}
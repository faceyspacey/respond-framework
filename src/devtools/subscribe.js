import sliceByModulePath from '../utils/sliceByModulePath.js'


export default (store, triggerIndexes) => async message => {
  try {
    switch (message.type) {
      case 'DISPATCH':
        return await handleDispatch(store, message, triggerIndexes)
  
      case 'ACTION': 
        return await handleAction(store, message)
    }
  }
  catch (error) {
    store.onError(error, 'devtools', message)
  }
}



const handleDispatch = async (store, message, triggerIndexes) => {
  switch (message.payload?.type) {
    case 'JUMP_TO_ACTION': { // jump
      const index = triggerIndexes[message.payload.actionId]
      return store.events.replayTools.replayEventsToIndex.dispatch({ index })
    }

    case 'TOGGLE_ACTION': { // skip
      const index = triggerIndexes[message.payload.id]
      return store.events.replayTools.skipEvent.dispatch({ index })
    }

    case 'COMMIT':
      return store.events.replayTools.saveTest.dispatch()


    case 'RESET':
      return store.events.replayTools.reload.dispatch()

    case 'ROLLBACK': {// Revert button
      const index = store.state.replayTools.evsIndex - 1
      return store.events.replayTools.replayEventsToIndex.dispatch({ index })
    }

    case 'PAUSE_RECORDING': // devtools doesn't have API to remember status on refresh, so it's hard to put this button to use, todo: find something else
      break

    case 'REORDER_ACTION': {
      const { actionId, beforeActionId } = message.payload // todo: reorder
      break
    }

    case 'IMPORT_STATE': {    // prolly not gonna use
      break
    }
  }
}


const handleAction = async (store, message) => {
  const { name, args } = message.payload

  const event = sliceByModulePath(store.events, name)
  const [arg, meta] = args.map(a => eval('(' + a + ')'))
  
  await event.dispatch(arg, meta)
}
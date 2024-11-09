export default (storeOld, triggerIndexes) => async message => {
  try {
    switch (message.type) {
      case 'DISPATCH':
        return await handleDispatch(storeOld, message, triggerIndexes)
  
      case 'ACTION': 
        return await handleAction(storeOld, message)
    }
  }
  catch (error) {
    storeOld.onError({ error, kind: 'devtools', message })
  }
}



const handleDispatch = async (storeOld, message, triggerIndexes) => {
  switch (message.payload?.type) {
    case 'JUMP_TO_ACTION': { // jump
      const index = triggerIndexes[message.payload.actionId]
      return storeOld.events.replayTools.replayEventsToIndex.dispatch({ index })
    }

    case 'TOGGLE_ACTION': { // skip
      const index = triggerIndexes[message.payload.id]
      return storeOld.events.replayTools.skipEvent.dispatch({ index })
    }

    case 'COMMIT':
      return storeOld.events.replayTools.saveTest.dispatch()


    case 'RESET':
      return storeOld.events.replayTools.reload.dispatch()

    case 'ROLLBACK': {// Revert button
      const index = storeOld.state.replayTools.evsIndex - 1
      return storeOld.events.replayTools.replayEventsToIndex.dispatch({ index })
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


const handleAction = async (storeOld, message) => {
  const { name: type, args } = message.payload

  const event = storeOld.eventsByType[type]
  const [arg, meta] = args.map(a => eval('(' + a + ')'))
  
  await event.dispatch(arg, meta)
}
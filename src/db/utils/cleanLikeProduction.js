import { createReviver, replacer } from '../../utils/revive.js'


export default (argsOrResponse = {}, state, modulePath) => {
  const reviver = createReviver(state, modulePath)
  return JSON.parse(JSON.stringify(argsOrResponse, replacer), reviver) // mirror production response
}
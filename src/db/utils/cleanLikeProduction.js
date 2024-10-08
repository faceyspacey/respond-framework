import { createReviver } from '../../utils/revive.js'


export default (argsOrResponse = {}, state, modulePath) => {
  const reviver = createReviver(state, modulePath)
  return JSON.parse(JSON.stringify(argsOrResponse), reviver) // mirror production response by removing instance methods attached to returned models from the server, and removing proxies from the client
}
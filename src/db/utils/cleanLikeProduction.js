import { createReviver } from '../../utils/revive.js'


export default (argsOrResponse = {}, state, branch) => {
  const reviver = createReviver(state, branch)
  return JSON.parse(JSON.stringify(argsOrResponse), reviver) // mirror production response
}
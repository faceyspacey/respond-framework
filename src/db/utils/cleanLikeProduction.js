import { createReviver } from '../../utils/jsonReplacerReviver.js'


export default (argsOrResponse = {}) => {
  return JSON.parse(JSON.stringify(argsOrResponse), createReviver()) // mirror production response by removing instance methods attached to returned models from the server, and removing proxies from the client
}
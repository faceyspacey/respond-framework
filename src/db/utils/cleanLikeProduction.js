import { createReviver, createReviverWithModels } from '../../utils/jsonReplacerReviver.js'


export default (argsOrResponse = {}, models) => {
  const reviver = models ? createReviverWithModels(models) : createReviver()
  return JSON.parse(JSON.stringify(argsOrResponse), reviver) // mirror production response by removing instance methods attached to returned models from the server, and removing proxies from the client
}
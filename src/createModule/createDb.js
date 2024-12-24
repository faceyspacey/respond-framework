import { isProd, isDev } from '../utils.js'
import _fetch, { __undefined__, argsIn } from '../helpers/fetch.js'
import { reviveApiClient } from './helpers/revive.js'
import createApiHandler from './createApiHandler.js'


export default (respond, Respond) => {
  Respond.prototype.apiHandler ??= isDev && createApiHandler({ db: respond.top.db }) // create only once for all respond instances -- only dev needs apiHandler on client

  const get = (_, table) => {
    const get = (_, method) => callDatabase(respond, table, method)
    return new Proxy({}, { get })
  }

  return new Proxy({}, { get })
}



const callDatabase = (respond, table, method) => {
  if (method === 'make')   return respond.models[table].make
  if (method === 'create') return respond.models[table].create

  const url = respond.options.apiUrl
  
  const getter = async (...args) => {
    const body = createBody(table, method, args, respond)
    const response = await fetch(url, body, getter, respond)
    return createResponse(respond, body, response)
  }

  getter.cache  = (...args) => (getter.useCache  = true) && getter(...args)
  getter.server = (...args) => (getter.useServer = true) && getter(...args)

  return getter
}





const fetch = async (apiUrl, body, getter, respond) => {
  const cached = respond.dbCache.get(body)
  if (cached) return cached

  isDev && await respond.simulateLatency()

  const r = isProd || getter.useServer
    ? await _fetch(apiUrl, body, respond)
    : await respond.apiHandler({ body }, { json: r => r }) // the magic: call server-side api handler directly on the client during development

  const response = r === __undefined__ ? undefined : r ? reviveApiClient(respond, body.branch)(r) : r

  if (getter.useCache) respond.dbCache.set(body, response)
  return response
}




const createBody = (table, method, argsRaw, respond) => {
  const { token, userId, adminUserId, basename, basenameFull, __dbFirstCall } = respond.topState
  const { state, focusedBranch, replays } = respond

  const branch = respond.moduleName === 'replayTools' ? 'replayTools' : replays.db.branchAbsolute // replayTools always at top even when child branch focused : db may be inherited, so we actually need to pass the branch inherited from

  const args = argsIn(argsRaw)
  const body = respond.options.getBody?.call(state, table, method, args) // additional body data for api calls
  const first = !__dbFirstCall

  return { branch, table, method, args, token, userId, adminUserId, basename, basenameFull, focusedBranch, first, ...body }
}




const createResponse = (respond, body, response) => {
  const { branch, table, method, args } = body

  respond.topState.__dbFirstCall = true
  respond.devtools.sendNotification({ branch, table, method, args, response })

  if (!response) {
    return response // eg: e.arg.user will be undefined no matter what, so we don't need to do anything
  }
  else if (Array.isArray(response)) {
    const value = respond.models[table].prototype._namePlural // eg: 'users
    Object.defineProperty(response, '__argName', { value, enumerable: false }) // automagic: dispatched events with response as arg value will move from eg: arg to arg.users
  }
  else if (response.__branchType) {
    const value = respond.models[table].prototype._name // eg: 'user'
    Object.defineProperty(response, '__argName', { value, enumerable: false }) // automagic: dispatched events with response as arg value will move from eg: arg to arg.user
  }

  return response
}
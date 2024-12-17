import { isProd, isDev, isServer } from '../utils.js'
import _fetch, { __undefined__, argsIn } from './fetch.js'
import { reviveApiClient, reviveApiServer } from '../utils/revive.js'
import flattenDatabase, { flattenModels } from './utils/flattenDatabase.js'


export const createDb = respond => {
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

  const r = isProd || getter.useServer
    ? await _fetch(apiUrl, body, respond)
    : await respond.apiHandler({ body }, { json: r => r })

  const response = r === __undefined__ ? undefined : r ? reviveApiClient(respond, body.branch)(r) : r

  if (getter.useCache) respond.dbCache.set(body, response)
  return response
}





export const createApiHandler = ({ db, log = true, context = {} }) => {
  const modelsByBranchType = flattenModels(db)
  const branches = flattenDatabase(db)

  return async (req, res) => {
    const { table, method, focusedBranch, branch } = reviveApiServer({ modelsByBranchType })(req.body)
    
    if (log) console.log(`request.request: db.${table}.${method}`, req.body)
      
    const Table = resolveTable(branches, focusedBranch, branch, table) // eg: branches['admin.foo'].user
    if  (!Table)  return res.json({ error: 'table-absent', params: req.body })
    const respo = await Object.create(Table).callMethod(req, context)

    if (log) console.log(`respond.response: db.${table}.${method}`, ...(isDev ? [] : [req.body, '=>']), respo) // during prod, other requests might come thru between requests, so response needs to be paired with request (even tho we already logged request)
  
    return res.json(respo === undefined ? __undefined__ : respo)
  }
}




const resolveTable = (db, fb, branch, table) =>
  fb === branch // may need to use original db without props
    ? db[branch].original[table] // use original for top focused db, as props variant is stored in branches at branches[fb][table] (absolute top w)
    : db[branch][table]




const createBody = (table, method, argsRaw, respond) => {
  const { token, userId, adminUserId, basename, basenameFull, __dbFirstCall } = respond.getStore()
  const { state, focusedBranch, replays } = respond

  const branch = respond.moduleName === 'replayTools' ? 'replayTools' : replays.db.branchAbsolute // replayTools always at top even when child branch focused : db may be inherited, so we actually need to pass the branch inherited from

  const args = argsIn(argsRaw)
  const body = respond.options.getBody?.call(state, table, method, args)
  const first = !__dbFirstCall

  return { branch, table, method, args, token, userId, adminUserId, basename, basenameFull, focusedBranch, first, ...body }
}




const createResponse = (respond, body, response) => {
  const { branch, table, method, args } = body

  const { state, models } = respond
  respond.getStore().__dbFirstCall = true

  // Promise.resolve().then().then().then().then().then(() => { // rather than a queue/flush approach (which we had and had its own problems due different usages in userland), hopping over the calling event callback preserves the correct order in the devtools most the time, given this always runs very fast in the client (note only 2 .thens are needed most of the time, but it requires normally 8 to skip over a single basic subsequent event, so 5 .thens has a better chance of hopping over a more complicated callback with multiple async calls)
  //   const type = `=> db.${table}.${method}`
  //   state.respond.devtools.sendNotification({ type, branch, table, method, args, response })
  // })

  if (singularPlural[method]) {
    if (!response) return response // eg: arg.user will be undefined anyway by the time it reaches reducers
    const model = models[table].prototype
    const value = singularPlural[method] === 'plural' ? model._namePlural : model._name
    if (response.hasOwnProperty(value) && (response.__branchType || Array.isArray(response[value]))) return response // overriden method that returns nested objects/arrays, and therefore doesn't need this
    Object.defineProperty(response, '__argName', { value, enumerable: false })
  }

  return response
}





const singularPlural = {
  findOne: 'singular',
  find: 'plural',
  insertOne: 'singular',
  updateOne: 'singular',
  upsert: 'singular',
  save: 'singular',
  findAll: 'plural',
  findLike: 'plural',
  search: 'plural',
  searchGeo: 'plural',

  findOneSafe: 'singular',
  findManySafe: 'singular',
  insertOneSafe: 'singular',
  updateOneSafe: 'singular',
  upsertSafe: 'singular',
  saveSafe: 'singular',
  findAllSafe: 'plural',
  findLikeSafe: 'plural',
  searchSafe: 'plural',
  searchGeoSafe: 'plural',
}

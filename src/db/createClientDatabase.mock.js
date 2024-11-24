import fetch, { argsIn } from './fetch.js'
import simulateLatency from '../utils/simulateLatency.js'
import createDbProxy from './utils/createDbProxy.js'
import createApiCache from './utils/createApiCache.js'
import obId from '../utils/objectIdDevelopment.js'
import { createApiReviverForClient, createReviver as createApiReviverForServer } from '../utils/revive.js'
import { createTableConstructors } from './utils/flattenDbTree.js'


export default ({ mod, proto, state, respond, branch }) => {
  let { db } = mod

  if (!db && !parent.db) {
    db = respond.findClosestAncestorWith('db', branch)?.db ?? {} // focused module is a child without its own db, but who expects to use a parent module's db when in production
  }
  else if (!db) return respond.db = proto.db = parent.db

  const clientReviver = createApiReviverForClient(respond, branch)
  const serverReviver = createApiReviverForServer(respond.focusedModule.db ?? respond.findClosestAncestorWith('db', respond.focusedModule.branch)?.db ?? {}) // needs top focusedBranch's db to simulate reviver on server, which will then find controllers based on branch
  
  const reviveClient = res => res === undefined ? undefined : JSON.parse(JSON.stringify(res), clientReviver)   // simulate production fetch reviver
  const reviveServer = args =>                                JSON.parse(JSON.stringify(args), serverReviver)  // simulate production server express.json reviver

  const cache = createApiCache(state)
  const { apiUrl, getContext } = respond.options

  const tables = createTableConstructors(db)

  return respond.db = proto.db = createDbProxy({
    cache,
    call(table, method) {
      const Model = respond.models[table]

      if (method === 'make') {
        return d => new Model({ ...d, __type: table }, branch)
      }

      if (method === 'create') {
        return d => new Model({ ...d, __type: table, id: d?.id || obId() }, branch)
      }
    
      let useCache
      meth.cache = function(...args) { useCache = true; return meth(...args); }

      let useServer
      meth.server = function(...args) { useServer = true; return meth(...args); }
      
      return meth

      async function meth(...args) {
        const T = tables[table]
        if (!T) throw new Error(`table "${table}" does not exist in ${branch ?? 'top'} module`)
    
        const { token, userId, adminUserId, basename, basenameFull } = state.getStore()
        const context = { token, userId, adminUserId, basename, basenameFull, ...getContext?.call(state, table, method, args) }
        const body = { ...context, branch, table, method, args: useServer ? args : reviveServer(argsIn(args)), first: !state.__dbFirstCall, focusedBranch: respond.focusedBranch }
    
        const cached = useCache && cache.get(body)

        if (cached) {
          const response = Object.assign({}, cached, { meta: { dbCached: true } })
          return handleResponse(state, { branch, table, method, args, response })
        }

        const response = useServer
          ? await fetch(apiUrl, body, clientReviver)
          : reviveClient(await new T().call({ body }))

        await simulateLatency(state, useServer)

        if (useCache) cache.set(body, response)

        return handleResponse(state, branch, table, method, args, response, respond.models)
      }
    }
  })
}


const handleResponse = (state, branch, table, method, args, response, models) => {
  state.__dbFirstCall = true

  Promise.resolve().then().then().then().then().then(() => { // rather than a queue/flush approach (which we had and had its own problems due different usages in userland), hopping over the calling event callback preserves the correct order in the devtools most the time, given this always runs very fast in the client (note only 2 .thens are needed most of the time, but it requires normally 8 to skip over a single basic subsequent event, so 5 .thens has a better chance of hopping over a more complicated callback with multiple async calls)
    const type = `=> db.${table}.${method}`
    state.devtools.sendNotification({ type, branch, table, method, args, response })
  })

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
  findSafe: 'singular',
  insertOneSafe: 'singular',
  updateOneSafe: 'singular',
  upsertSafe: 'singular',
  saveSafe: 'singular',
  findAllSafe: 'plural',
  findLikeSafe: 'plural',
  searchSafe: 'plural',
  searchGeoSafe: 'plural',
}

const keyNamesByMethod2 = {
  findOne: true,
  find: true,
  insertOne: true,
  updateOne: true,
  upsert: true,
  save: true,
  findAll: true,
  findLike: true,
  search: true,
  searchGeo: true,

  findOneSafe: true,
  findSafe: true,
  insertOneSafe: true,
  updateOneSafe: true,
  upsertSafe: true,
  saveSafe: true,
  findAllSafe: true,
  findLikeSafe: true,
  searchSafe: true,
  searchGeoSafe: true,
}
import { isDev, isServer } from '../helpers/constants.js'
import _fetch, { __undefined__, argsOut } from '../helpers/fetch.js'
import { reviveApiServer } from './helpers/revive.js'
import flattenDatabase, { flattenModels } from '../db/helpers/flattenDatabase.js'



export default function createApiHandler({ db, log = isServer, context = {} }) { // used in this file on the client + wrapped within a thin express handler on the server in createApi.js
  const modelsByBranchType = flattenModels(db)
  const branches = flattenDatabase(db)

  return async (req, res) => {
    req = revive(modelsByBranchType, req)

    const { table, method, focusedBranch, branch } = req.body

    if (log) console.log(`request.request: db.${table}.${method}`, req.body)
      
    const Table = resolveTable(branches, focusedBranch, branch, table) // eg: branches['admin.foo'].user
    if  (!Table)  return res.json({ error: 'table-absent', params: req.body })
    const respo = await Object.create(Table).makeRequest(req, context)

    if (log) console.log(`respond.response: db.${table}.${method}`, ...(isDev ? [] : [req.body, '=>']), respo) // during prod, other requests might come thru between requests, so response needs to be paired with request (even tho we already logged request)
  
    const response = respo === undefined ? __undefined__ : respo
    return res.json(response)
  }
}




const revive = (modelsByBranchType, req) => {
  req = isServer ? req : JSON.parse((JSON.stringify(req))) // simulate passing from client to server in dev

  const eventsByType = typeof window == 'undefined' ? {} : window.state?.respond.eventsByType // todo: when ssr is ready, grab eventsByType the correct way
  
  req.body = reviveApiServer({ modelsByBranchType, eventsByType })(req.body)

  req.body.args = argsOut(req.body.args) // convert '__undefined__' to undefined

  return req
}



const resolveTable = (db, fb, branch, table) =>
  fb === branch // may need to use original db without props
    ? db[branch].original[table] // use original for top focused db, as props variant is stored in branches at branches[fb][table] (absolute top w)
    : db[branch][table]
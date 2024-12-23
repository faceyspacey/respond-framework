import { isDev, isServer } from '../helpers/constants.js'
import _fetch, { __undefined__ } from '../helpers/fetch.js'
import { reviveApiServer } from './helpers/revive.js'
import flattenDatabase, { flattenModels } from '../db/helpers/flattenDatabase.js'



export default function createApiHandler({ db, log = isServer, context = {} }) { // used in this file on the client + wrapped within a thin express handler on the server in createApi.js
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
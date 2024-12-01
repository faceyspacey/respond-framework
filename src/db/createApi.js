import createWallabySocketsServer from '../wallaby/createWallabySocketsServer.js'
import { flattenDatabase, flattenModels } from './utils/flattenDbTree.js'
import { isDev as dev } from '../utils.js'
import replayTools from '../modules/replayTools/db.js'
import { prepend as prepend } from '../utils/sliceBranch.js'
import { __undefined__ } from './fetch.js'


export default opts => {
  const handle = createHandler(opts)

  return async (req, res) => {
    try {
      await handle(req, res)
    }
    catch (error) {
      console.error('respond: the following error occurred in a table method', req.body, error)
      res.json({ error: 'unknown-server-error', params: { ...req.body, message: error.message } })
    }
  }
}


const createHandler = ({ db, log = true, server, context = {} }) => {
  const branches = createBranches(db)
  context.io = dev && server && createWallabySocketsServer(server)

  return async (req, res) => {
    const { table, method, focusedBranch: fb, branch: b } = req.body
    
    if (log) console.log(`request.request: db.${table}.${method}`, req.body)
      
    const T = getTable(branches, fb, b, table) // eg: branches['admin.foo'].user
    if (!T) return res.json({ error: 'table-absent', params: req.body })
    const r = await new T().call(req, context)

    if (log) console.log(`respond.response: db.${table}.${method}`, ...(dev ? [] : [req.body, '=>']), r) // during prod, other requests might come thru between requests, so response needs to be paired with request (even tho we already logged request)
  
    res.json(r === undefined ? __undefined__ : r)
  }
}


const getTable = (branches, fb, b, table) => {
  if (fb && !b) return branches[fb][table].original // use original for top focused db, as props variant is stored in branches at branches[fb][table]
  if (fb && b === 'replayTools') return branches.replayTools[table]

  const branch = prepend(fb, b)
  return branches[branch][table]
}


const createBranches = db => {
  if (dev) {
    db.moduleKeys.push('replayTools')
    db.replayTools = replayTools
  }

  db.modelsByBranchType = flattenModels(db)

  return flattenDatabase(db)
}
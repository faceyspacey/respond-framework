import createWallabySocketsServer from '../wallaby/createWallabySocketsServer.js'
import { flattenDatabase, flattenModels } from './utils/flattenDbTree.js'
import { isDev as dev } from '../utils.js'
import replayTools from '../modules/replayTools/db.js'
import { prependBranch as prepend } from '../utils/sliceBranch.js'
import { __undefined__ } from './fetch.js'


export default opts => {
  const handle = createHandler(opts)

  return async (req, res) => {
    try {
      await handle(req, res)
    }
    catch (error) {
      console.error('respond: the following error occurred in a controller method', req.body, error)
      res.json({ error: 'unknown-server-error', params: { ...req.body, message: error.message } })
    }
  }
}


const createHandler = ({ db, log = true, server, call = defCall }) => {
  if (dev) {
    db.moduleKeys.push('replayTools')
    db.replayTools = replayTools
  }

  db.modelsByBranchType = flattenModels(db)

  const branches = flattenDatabase(db)
  const io = dev && server && createWallabySocketsServer(server)

  return async (req, res) => {
    const { focusedBranch: fb, branch: b, controller, method } = req.body
    
    if (log) console.log(`request.request: db.${table}.${method}`, req.body)
      
    const Controller = branches[prepend(fb, b)][controller] // eg: controllers['admin.foo'].user
    if (!Controller) return res.json({ error: 'controller-absent', params: req.body })

    const r = await new Controller(req, io).call(req.body)
    const response = r === undefined ? {} : r // client code always expects objects, unless something else is explicitly returned
  
    if (log) console.log(`respond.response: db.${controller}.${method}`, ...(dev ? [] : [req.body, '=>']), response) // during prod, other requests might come thru between requests, so response needs to be paired with request
  
    res.json(response)
  }
}
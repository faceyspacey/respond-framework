import createWallabySocketsServer from '../wallaby/createWallabySocketsServer.js'
import flattenDbTreeByBranchBy from './utils/flattenDbTreeByBranchBy.js'
import { isDev as dev } from '../utils.js'
import { replacer } from '../utils/revive.js'


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


const createHandler = ({ db, log = true, server }) => {
  const controllers = flattenDbTreeByBranchBy('controllers', db)
  const io = dev && server && createWallabySocketsServer(server)

  return async (req, res) => {
    const { branch, controller, method } = req.body

    if (log) console.log(`request.request: db.${controller}.${method}`, req.body)
      
    const Controller = controllers[branch][controller] // eg: controllers['admin.foo'].user
    if (!Controller) return res.json({ error: 'controller-absent', params: req.body })

    const r = await new Controller(req, io).call(req.body)
    const response = r === undefined ? {} : r // client code always expects objects, unless something else is explicitly returned
  
    if (log) console.log(`respond.response: db.${controller}.${method}`, ...(dev ? [] : [req.body, '=>']), response) // during prod, other requests might come thru between requests, so response needs to be paired with request
  
    res.type('json').send(JSON.stringify(response, replacer))
  }
}
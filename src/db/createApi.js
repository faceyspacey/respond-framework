import createWallabySocketsServer from '../wallaby/createWallabySocketsServer.js'
import { isDev } from '../utils.js'
import { createApiHandler } from './createClientDatabase.mock.js'
import replayTools from '../modules/replayTools/db.js'


export default opts => {
  const options = createOptions(opts)
  const apiHandler = createApiHandler(options)

  return async (req, res) => {
    try {
      await apiHandler(req, res)
    }
    catch (error) {
      console.error('respond: the following error occurred in a table method', req.body, error)
      res.json({ error: 'unknown-server-error', params: { ...req.body, message: error.message } })
    }
  }
}




const createOptions = (opts = {}) => {
  if (!isDev) return opts

  opts.context ??= {}
  opts.context.io = isDev && opts.server && createWallabySocketsServer(opts.server)

  opts.db ??= {}
  opts.db.moduleKeys.push('replayTools')
  opts.db.replayTools = replayTools

  return opts
}
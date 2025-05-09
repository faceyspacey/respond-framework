import replayTools from '../modules/replayTools/db.js'
import createApiHandler from '../createModule/createApiHandler.js'
import { isDev } from '../utils.js'


export default opts => {
  const options = createOptions(opts)
  const apiHandler = createApiHandler(options)

  return async (req, res) => {
    try {
      await apiHandler(req, res) // this function is used directly in development on the client as well
    }
    catch (error) {
      console.error('respond: the following error occurred in a table method', req.body, error)
      res.json({ error: 'unknown-server-error', params: { ...req.body, message: error.message } })
    }
  }
}




const createOptions = (opts = {}) => {
  if (!isDev) return opts

  opts.context ??= {} // eg opts.context.io can be assigned to socket.io in userland

  opts.db ??= {}
  opts.db.moduleKeys.push('replayTools')
  opts.db.replayTools = replayTools

  return opts
}
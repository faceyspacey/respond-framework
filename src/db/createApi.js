import Developer from '../server/DeveloperController.js'
import createWallabySocketsServer from '../wallaby/createWallabySocketsServer.js'
import secretMock from './secret.mock.js'


export default opts => {
  const isProd = process.env.NODE_ENV === 'production'
  const handler = isProd ? createHandler(opts) : createHandlerDev(opts)

  return async (req, res) => {
    try {
      await handler(req, res)
    }
    catch (error) {
      if (!req.body) {
        const error = 'missing express middleware: app.use(express.json({ reviver: createReviver() }))'
        res.json({ error, params: { controller, method, args, message: error.message } })
        return
      }

      const { controller, method, args } = req.body
      console.error('Respond: the following error occurred in a controller method', { controller, method, args }, error)
      res.json({ error: 'unknown-server', params: { controller, method, args, message: error.message } })
    }
  }
}



const createHandler = ({
  controllers = {},
  nested = false,
  secret = secretMock,
  logRequest = true,
  logResponse = false
}) => async (request, res) => {
  const { body } = request
  const { modulePath, controller, method, args, ...rest } = body

  const c = nested
    ? controllers[modulePath]?.[controller] // DYNAMIC MODULE-SPECIFIC SELECTION, eg: controllers['admin.foo'].user
    : controllers[controller]
  
  if (logRequest !== false) {
    console.log(`Respond (REQUEST): db.${controller}.${method}`, { modulePath, controller, method, args, context: rest })
  }

  if (!c) {
    res.json({ error: 'controller-not-permitted', params: { modulePath, controller, method } })
    return
  }

  const instance = { ...c, secret }
  const context = { modulePath, controller, method, args, ...rest, request }

  let response = await instance._callFilteredByRole(context)
  response = response === undefined ? {} : response // client code always expects objects, unless something else is explicitly returned

  if (logResponse !== false) {
    console.log(`Respond (RESPONSE): db.${controller}.${method}`, { modulePath, controller, method, args, context: rest, response })
  }
  
  if (response?.error) {
    response.params = { ...response.params, controller, method }
  }

  res.json(response)
}





// Developer controller only available during development

const createHandlerDev = opts => {
  const io = opts.server && createWallabySocketsServer(opts.server)

  return async (req, res) => {
    const { body } = req
    const { controller, method, args, ...rest } = body
  
    if (controller !== 'developer') {
      res.json({ error: 'invalid developer controller' })
      return
    }
  
    const context = { controller, method, args, ...rest, request: req, io }
    const instance = { ...Developer, ...opts.developerControllerMixin, context }
    
    console.log(`Respond (REQUEST): db.${controller}.${method}`, { modulePath: '', controller, method, args, context: rest })
  
    let response = await instance._callFilteredByRole(context)
    response = response === undefined ? {} : response
  
    console.log(`Respond (RESPONSE): db.${controller}.${method}`, { modulePath: '', controller, method, args, context: rest, response })
    
    res.json(response)
  }
}
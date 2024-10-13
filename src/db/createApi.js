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
        const error = 'missing express middleware: app.use(express.json({ reviver: createServerReviver() }))'
        console.error(error)
        res.json({ error })
        return
      }

      const { controller, method, args } = req.body
      console.error('Respond: the following error occurred in a controller method', { controller, method, args }, error)
      res.json({ error: 'unknown-server', params: { controller, method, args, message: error.message } })
    }
  }
}




const createHandler = ({
  controllers: controllersByModulePath = {},
  findController,
  secret = secretMock,
  logRequest = true,
  logResponse = false
}) => async (req, res) => {
  const { body } = req
  const { modulePath, controller, method } = body

  const Controller = findController
    ? findController(controllersByModulePath, modulePath, controller)
    : controllersByModulePath[modulePath][controller] // eg: controllers['admin.foo'].user

  if (logRequest !== false) {
    console.log(`Respond (REQUEST): db.${controller}.${method}`, body)
  }

  if (!Controller) {
    res.json({ error: 'controller-not-permitted', params: { modulePath, controller, method } })
    return
  }

  let response = await new Controller(request, secret)._callFilteredByRole(body)
  response = response === undefined ? {} : response // client code always expects objects, unless something else is explicitly returned

  if (logResponse !== false) {
    console.log(`Respond (RESPONSE): db.${controller}.${method}`, { ...body, response })
  }
  
  if (response?.error) {
    response.params = { ...response.params, controller, method }
  }

  res.json(response)
}





// Developer controller only available during development

const createHandlerDev = opts => {
  const io = opts.server && createWallabySocketsServer(opts.server)

  function Controller(io, request = {}) { this.io = io, this.request = request }
  Controller.prototype = Developer

  return async (req, res) => {
    const { body } = req
    const { controller, method } = body
  
    if (controller !== 'developer') {
      res.json({ error: 'invalid developer controller' })
      return
    }
  
    console.log(`Respond (REQUEST): db.${controller}.${method}`, { modulePath: '', ...body })
  
    let response = await new Controller(io, req)._callFilteredByRole(body)
    response = response === undefined ? {} : response
  
    console.log(`Respond (RESPONSE): db.${controller}.${method}`, { modulePath: '', ...body, response })
    
    res.json(response)
  }
}


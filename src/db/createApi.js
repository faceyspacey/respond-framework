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
  controllers: controllersByBranch = {},
  findController,
  logRequest = true,
  logResponse = false
}) => async (req, res) => {
  const { body } = req
  const { branch, controller, method } = body

  const Controller = findController
    ? findController(controllersByBranch, branch, controller)
    : controllersByBranch[branch][controller] // eg: controllers['admin.foo'].user

  if (logRequest !== false) {
    console.log(`Respond (REQUEST): db.${controller}.${method}`, body)
  }

  if (!Controller) {
    res.json({ error: 'controller-not-permitted', params: { branch, controller, method } })
    return
  }

  let response = await new Controller(request)._callFilteredByRole(body)
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

  function Controller(request = {}, io) { this.request = request; this.io = io; }
  Controller.prototype = Developer

  return async (req, res) => {
    const { body } = req
    const { controller, method } = body
  
    if (controller !== 'developer') {
      res.json({ error: 'invalid developer controller' })
      return
    }
  
    console.log(`Respond (REQUEST): db.${controller}.${method}`, { branch: '', ...body })
  
    let response = await new Controller(req, io)._callFilteredByRole(body)
    response = response === undefined ? {} : response
  
    console.log(`Respond (RESPONSE): db.${controller}.${method}`, { branch: '', ...body, response })
    
    res.json(response)
  }
}


import Developer from '../server/DeveloperController.js'
import createWallabySocketsServer from '../wallaby/createWallabySocketsServer.js'
import secretMock from './secret.mock.js'
import createModules from './utils/createModules.js'
import { empty, createParameterString, createResponseString } from './utils/logServerRequests.js'


export default opts => {
  const isProd = process.env.NODE_ENV === 'production'
  const handler = isProd ? createHandler(opts) : createHandlerDev(opts)

  return async (req, res) => {
    try {
      await handler(req, res)
    }
    catch (error) {
      const { controller, method, args } = req.body
      console.error('Respond: the following error occurred in a controller method', { controller, method, args }, error)
      res.json({ error: 'unknown-server', params: { controller, method, args, message: error.message } })
    }
  }
}



const createHandler = ({
  topModule,
  secret = secretMock,
  logRequest,
  logResponse
}) => {
  const modules = createModules(topModule)

  return async (request, res) => {
    const { body } = request
    const { modulePath, controller, method, args, ...rest } = body
  
    const c = modules[modulePath]?.[controller] // DYNAMIC MODULE-SPECIFIC SELECTION, eg: allControllers['admin.foo'].user
    
    if (!c) {
      res.json({ error: 'controller-not-permitted', params: { modulePath, controller, method } })
      return
    }

    const instance = { ...c, secret }
    const context = { modulePath, controller, method, args, ...rest, request }
    
    if (logRequest !== false) {
      const argString = createParameterString(instance, method, args)
      console.log(`Respond (REQUEST): db.${controller}.${method}(${argString})`)
    }

    let response = await instance.callFilteredByRole(context)
    response = response === undefined ? empty : response

    if (logResponse !== false) {
      const resString = createResponseString(response)
      console.log(`Respond (RESPONSE): db.${controller}.${method}(${argString}):\n${resString}`)
    }
    
    if (response?.error) {
      response.params = { ...response.params, controller, method }
    }

    res.json(response)
  }
}





// Developer controller only available during development

const createHandlerDev = opts => {
  const io = opts.server && createWallabySocketsServer(opts.server)

  return async (request, res) => {
    const { body } = request
    const { controller, method, args, ...rest } = body
  
    if (controller !== 'developer') {
      res.json({ error: 'invalid developer controller' })
      return
    }
  
    const context = { controller, method, args, ...rest, request, io }
    const instance = { ...Developer, ...opts.developerControllerMixin, context }
    
    const argString = createParameterString(instance, method, args)
  
    console.log(`Respond (REQUEST): db.${controller}.${method}(${argString})`)
  
    let response = await instance.callFilteredByRole(context)
    response = response === undefined ? empty : response
  
    const resString = createResponseString(response)
  
    console.log(`Respond (RESPONSE): db.${controller}.${method}(${argString}):\n${resString}`)
    
    res.json(response)
  }
}
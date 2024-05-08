import fetch from './fetch.js'

const controller = 'developer'


export default db => new Proxy({}, {
  get(target, method) {
    if (typeof method !== 'string') return
  
    return async (...args) => {
      if (!method) return
      
      args = args.map(a => a === undefined ? '__undefined__' : a)
      
      const context = { controller, method, args }
      const response = await fetch(context, db.options.apiUrl)

      Promise.resolve().then().then().then().then().then(() => { // rather than a queue/flush approach (which we had and had its own problems due different usages in userland), hopping over the calling event callback preserves the correct order in the devtools most the time, given this always runs very fast in the client (note only 2 .thens are needed most of the time, but it requires normally 8 to skip over a single basic subsequent event, so 5 .thens has a better chance of hopping over a more complicated callback with multiple async calls)
        db.options.sendNotification(db, { type: `=> db.${controller}.${method}`, ...context, response })
      })

      return response
    }
  }
})
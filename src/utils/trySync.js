export default (res, cb) => 
  res instanceof Promise ? res.then(cb) : cb(res)

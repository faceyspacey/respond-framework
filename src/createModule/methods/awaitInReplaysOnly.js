export default function(f, onError) {           
  const promise = typeof f === 'function' ? f() : f // can be function
  if (!(promise instanceof Promise)) return
  this.promises.push(promise.catch(onError))
}
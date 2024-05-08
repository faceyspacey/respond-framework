const recurse = events => 
  Object.keys(events).reduce((acc, k) => {
    const event = events[k]
    acc[k] = typeof event === 'function' ? event : recurse(event)
    return acc
  }, {})


export default recurse
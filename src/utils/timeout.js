export default (ms = 300) => {
  const dontAwait = window.isFastReplay || process.env.NODE_ENV === 'test'
  if (dontAwait) return
  return new Promise(res => setTimeout(res, ms))
}


export const pollCondition = (condition, ms = 250) => {
  if (condition()) return
  
  return new Promise(res => {
    const check = () => {
      if (!condition()) return
      clearInterval(timer)
      res()
    }

    const timer = setInterval(check, ms)
  })
}
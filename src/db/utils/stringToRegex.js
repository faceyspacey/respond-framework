export default v =>
  typeof v === 'string' && isRegexString(v)
    ? stringToRegex(v) // mongo supports regex queries (similar to sql like queries)
    : v


export const isRegexString = v => 
  v.charAt(0) === '/' && (
    v.slice(-2) === '/i' ||
    v.slice(-1) === '/'
  )
  

const stringToRegex = v =>
  v.endsWith('/i')
    ? new RegExp(v.slice(1, v.lastIndexOf('/')), 'i')
    : new RegExp(v.slice(1, v.lastIndexOf('/')))
export default v => isRegexString(v) ? stringToRegex(v) : v // mongo supports regex queries (similar to sql like queries)


export const isRegexString = v => 
  typeof v === 'string' &&
  v.charAt(0) === '/' && (
    v.slice(-2) === '/i' ||
    v.slice(-1) === '/'
  )
  

const stringToRegex = v =>
  v.endsWith('/i')
    ? new RegExp(v.slice(1, v.lastIndexOf('/')), 'i')
    : new RegExp(v.slice(1, v.lastIndexOf('/')))
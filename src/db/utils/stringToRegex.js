export default function stringToRegex(v) { // mongo supports regex queries (similar to sql like queries)
  return v.endsWith('/i')
    ? new RegExp(v.slice(1, v.lastIndexOf('/')), 'i')
    : new RegExp(v.slice(1, v.lastIndexOf('/')))
}


export const isRegexString = v => 
  typeof v === 'string' &&
  v.charAt(0) === '/' &&
  (v.slice(-1) === '/' || v.slice(-2) === '/i')
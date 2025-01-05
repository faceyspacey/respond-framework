import { isProd } from '../../../helpers/constants.js'
import { parseSearch, stringifyQuery } from '../../../helpers/searchQuery.js'


export default function settingsToHash({ ...query }, branch) {
  if (branch) query.focusedBranch = branch
  return permalinkPrefix + stringifyQuery(query) 
}



export const hashToSettings = () => {
  if (isProd) return

  const h = typeof window !== undefined && window.location?.hash

  if (h && h[1] === '!') {
    const search = stripUserHash(h.slice(2)) // strip possible second hash by user, eg: #!userId=123#foo
    return parseSearch(search) // use hash so search can still be used unobstructed in userland (as hash can easily used for both purposes as handled in this file)
  }
}


export const stripPermalink = (h = '') => h[0] === '!' ? stripPermalinkHash(h) : h

const stripPermalinkHash = h => {
  const userHashIndex = h.indexOf('#')
  return userHashIndex > -1 ? h.slice(userHashIndex + 1) : '' // eg: stripPermalink('#!userId=123#foo') -> '#foo' or '#!userId=123' -> ''
}

const stripUserHash = h => {
  const userHashIndex = h.indexOf('#')
  return userHashIndex > -1 ? h.slice(0, userHashIndex) : h // eg: stripPermalink('userId=123#foo') -> 'userId=123'
}



export const permalinkPrefix = '#!'
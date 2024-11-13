import session from '../utils/sessionStorage.js'
import bs from './browserState.js'
import changePath from './changePath.js'
import { linkOut } from './out.js'
import { hasHistory } from '../utils/bools.js'


export default () => {
  const prev = typeof window !== 'undefined' && window.state?.history?.state

  const state = hasHistory
    ? prev ?? Object.assign(bs, JSON.parse(session.getItem('browserState')))
    : {}

  return {
    state,
    changePath: hasHistory ? changePath : function() {},
    linkOut,
  }
}
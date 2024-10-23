import sesh from '../utils/sessionStorage.js'
import changePath from './changePath.js'
import { linkOut } from './out.js'
import bs from './browserState.js'
import { hasHistory } from '../utils/bools.js'


export default {
  state: hasHistory ? Object.assign(bs, JSON.parse(sesh.getItem('browserState'))) : {},
  changePath: hasHistory ? changePath : function() {},
  linkOut,
}
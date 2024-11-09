import { createReviver } from './revive.js'

export default (obj, state) => obj && JSON.parse(JSON.stringify(obj), createReviver(state))
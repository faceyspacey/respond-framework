import { createReviver } from './jsonReplacerReviver.js'

export default (obj, events) => obj && JSON.parse(JSON.stringify(obj), createReviver(events))
const replays = Object.create({}) // proto will be used to prevent keys from being stored in sessionStorage
replays.settings = {}

export default replays // singleton for for import into controllers/db/models -- assigned in replays/index.js
export { default as findSelectedOption } from './modules/replayTools/helpers/findSelectedOption.js'
export { default as patchAnimatedForReplays } from './modules/replayTools/helpers/patchAnimatedForReplays.js'
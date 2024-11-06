export { default as findSelectedOption } from './modules/replayTools/helpers/findSelectedOption.js'
export { default as patchAnimatedForReplays } from './modules/replayTools/helpers/patchAnimatedForReplays.js'

export const createReplays = options => Object.assign(options, { handleRef: options })
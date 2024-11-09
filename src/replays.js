export { default as findSelectedOption } from './modules/replayTools/helpers/findSelectedOption.js'
export { default as patchAnimatedForReplays } from './modules/replayTools/helpers/patchAnimatedForReplays.js'

// ref will be passed to createReplays, resulting in the entire object being populated and able to be used/imported wherever in userland
export const createReplays = (options = {}) => Object.assign(options, { handleRef: options })
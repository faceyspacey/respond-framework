import slice from '../../../createModule/helpers/sliceBranch.js'
import nestAtBranch from './nestAtBranch.js'
import findClosestAncestorWith from '../../../createModule/helpers/findClosestAncestorWith.js'
import { strip } from '../../../createModule/helpers/sliceBranch.js'


export function nestAllSettings(configs, settings) {
  const references = new Map

  return Object.keys(settings).reduce((acc, b) => {
    let mod = settings[b]

    if (references.has(mod)) return acc // inherited settings share the same reference, and won't need to appear more than once
    references.set(mod, true)

    mod = ignoreDefaults(configs[b], mod)
    
    const clean = JSON.parse(JSON.stringify(mod)) // remove undefined keys
    if (Object.keys(clean).length === 0) return acc

    if (b === '') return { ...clean } // top module's settings becomes the root object, and it will be first, as settings form is pre-sorted ancestors first

    nestAtBranch(b, clean, acc) // if a parent reference is ignored because it shares the same replay settings as the grand parent, a grand child with its own replays will be nested in an empty parent object by this function
    return acc
  }, {})
}



const ignoreDefaults = (config, mod) =>
  Object.keys(mod).reduce((acc, k) => {
    const v = mod[k]
    if (v === config[k].defaultValueDevelopment) return acc
    acc[k] = v
    return acc
  }, {})



export function nestFocusedSettings(configs, settings, focusedBranch, respond) {
  const nestedSettings = nestAllSettings(configs, settings)

  const mod = slice(respond.top, focusedBranch)
  const hasDb = mod.db || mod.replays?.noDbDependency

  if (hasDb) return slice(nestedSettings, focusedBranch) ?? {} // undefined could happen if all settings undefined, due to "remove undefined keys" above
  
  const depMod = findClosestAncestorWith('db', focusedBranch, respond) ?? respond.top
  const depBranch = depMod.branchAbsolute

  const depSettings = slice(nestedSettings, depBranch) ?? {}
  const focusedSettings = slice(nestedSettings, focusedBranch) ?? {}

  depSettings.settingsBranchDependency = depBranch // branch needs to be assigned if branch can't be inferred by the module that the __tests__ folder is in -- due to inherting db from a parent module

  return removeOutOfBandBranches(depMod, depSettings, focusedSettings, depBranch, focusedBranch)
}





const removeOutOfBandBranches = (depMod, depSettings, focusedSettings, depBranch, focusedBranch) => {
  depMod.moduleKeys.forEach(k => delete depSettings[k])

  const relativeFocusedBranch = strip(depBranch, focusedBranch)
  return nestAtBranch(relativeFocusedBranch, focusedSettings, depSettings)
}
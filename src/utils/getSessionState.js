import sessionStorage from './sessionStorage.js'
import { searchToSettings as permalinkSettings } from '../modules/replayTools/helpers/createPermalink.js'


export default async ({ reload, replay, hmr, settings, hydration } = {}) => {
  const { prevState, replayTools: rt } = window.store ?? {}

  if (reload) return      { ...hydration, replayTools: { open: true }, replays: { settings } }
  else if (replay) return { ...hydration, replayTools: rt, replays: { settings } }
  else if (hmr) return    { ...prevState, replayTools: { ...prevState.replayTools, tab: rt.tab, open: rt.open }, lastEvent: rt.evs[rt.evsIndex] }

  const session = await sessionStorage.getItem('sessionState')
  const s = permalinkSettings()

  if (s) return { ...hydration, replays: { settings: s } }

  if (session) {
    const state = JSON.parse(session)
    if (state.replays) Object.assign(state.replays, { session: true })
    return state
  }

  return hydration
}
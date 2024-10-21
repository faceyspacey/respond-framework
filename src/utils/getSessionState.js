import sessionStorage from './sessionStorage.js'
import { searchToSettings as permalinkSettings } from '../modules/replayTools/helpers/createPermalink.js'


export default async ({ status, settings, hydration } = {}) => {
  const { prevState, replayTools: { form, ...rt } = {} } = window.store ?? {}

  switch (status) {
    case 'reload':  return { ...hydration, replayTools: { ...rt, evsIndex: -1, evs: [], divergentIndex: undefined }, replays: { settings } }
    case 'replay':  return { ...hydration, replayTools: { ...rt, evsIndex: -1 }, replays: { settings } }
    case 'hmr':     return { ...prevState, replayTools: { ...prevState.replayTools, tab: rt.tab, open: rt.open }, lastEvent: rt.evs[rt.evsIndex] }
  }

  const perm = permalinkSettings()
  if (perm) return { ...hydration, replays: { settings: perm } }

  const session = await sessionStorage.getItem('sessionState')
  if (!session) return hydration

  const state = JSON.parse(session)
  if (state.replays) Object.assign(state.replays, { status: 'session' })
  return state
}
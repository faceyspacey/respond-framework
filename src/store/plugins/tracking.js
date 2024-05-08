export default async (store, e) => {
  if (store.state.flash?.trackingCode && !f.viewTracked) {
    const f = store.state.flash

    if (f.kind === 'ad') {
      f.viewTracked = true
      const { user } = await store.db.user.trackView(f.trackingCode)
      await store.events.user.data.dispatch({ user })
    }
  }


  if (e.trackCampaignLink) {
    if (e.stage === 'click') {
      const { user } = await store.db.user.trackClick(e.trackingCode)
      await store.events.user.data.dispatch({ user })
    }
    else if (e.stage === 'conversion') {
      const { user } = await  store.db.user.trackConversion(e.trackingCode)
      await store.events.user.data.dispatch({ user })
    }
  }
}
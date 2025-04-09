export default function(err)  {
  const { error, kind = 'unknown', e } = err

  if (kind !== 'render') { // react render errors already logged
    console.error('respond: ' + kind, e || '')
    console.error(error)
  }

  const eventOnError = e?.event?.onError
  if (eventOnError) return eventOnError({ ...err, state: e.event.state })

  const ownOnError = this.state.options.onError
  if (ownOnError) return ownOnError({ ...err, state: this.state })

  const state = this.topState
  return state.options.onError?.({ ...err, state })
}
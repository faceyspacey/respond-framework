export default function(err)  {
  const { error, kind = 'unknown', e } = err

 if (kind !== 'render') { // react render errors already logged
  console.error('respond: ' + kind, e || '')
  console.error(error)
 }

  return this.options?.onError?.({ ...err, store: this })
}
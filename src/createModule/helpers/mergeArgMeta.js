export default (arg, meta, e) => {
  if (arg) {
    if (arg.meta) {
      const { meta: m, ...rest } = arg
      meta = { ...m, ...meta }
      arg = rest
    }
  
    Object.assign(e, arg)

    if (e.arg) Object.assign(e.arg, arg)
    else e.arg = arg
  }
  else e.arg ??= {}

  e.meta = e.meta
    ? meta ? { ...e.meta, ...meta } : e.meta
    : meta ?? {}
}
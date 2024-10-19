export default (plugins, store, e) => {
  return next(0)

  async function next(i) {
    const plugin = plugins[i]
    if (!plugin) return

    const res = await plugin(store, e)
    if (res === false) return false

    e = res ? { ...e, ...res } : e

    return await next(i + 1)
  }
}
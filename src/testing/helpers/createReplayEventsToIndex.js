export default trigger => async (events, index, startIndex = 0) => {
  for (let i = startIndex; i <= index; i++) {
    const e = events[i]
    await trigger(e)
  }
}
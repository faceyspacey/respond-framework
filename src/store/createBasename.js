export default ({ respond, state, props, mod, parent }) => {
  const { basenames, branch } = respond
  
  state.basename = basenames[branch] ?? props.basename ?? mod.basename ?? ''
  state.basenameFull = (parent.basenameFull ?? '') + state.basename
}
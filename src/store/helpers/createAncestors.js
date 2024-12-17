export default branch => {
  if (!branch) return ['']
  let b = ''
  return ['', ...branch.split('.').map(k =>  b = b ? b + '.' + k : k)].reverse()
}
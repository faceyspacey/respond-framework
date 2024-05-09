export default (proj, privateFields = []) => {
  if (proj) {
    const { id, ...p } = proj

    const isEmpty = Object.keys(p).length === 0

    if (isEmpty) {
      proj = {}
      privateFields.forEach(k => proj[k] = 0)
      return proj
    }
    
    const isExlude = Object.values(p).every(field => field === 0)
    
    if (isExlude) {
      privateFields.forEach(k => proj[k] = 0)
    }
    else {
      privateFields.forEach(k => delete proj[k])
    }
  }
  else {
    proj = {}
    privateFields.forEach(k => proj[k] = 0)
  }

  return proj
}

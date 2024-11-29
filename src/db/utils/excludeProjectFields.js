export default (proj, privateFields = []) => {
  if (proj) {
    const { id, ...p } = proj

    const values = Object.values(p)
    const isEmpty = values.length === 0

    if (isEmpty) {
      proj = {}
      privateFields.forEach(k => proj[k] = 0)
      return proj
    }
    
    const isExlude = values.every(field => field === 0)
    
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

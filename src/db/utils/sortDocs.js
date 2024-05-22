export default (docs, sort = { updatedAt: -1 }) => {
  const [key, key2] = Object.keys(sort)
  const direction = sort[key]
  
  const asc = (a, b) => 
    (+(a[key] > b[key] || b[key] === undefined) || +(a[key] === b[key]) - 1) ||
      (+(a[key2] > b[key2] || b[key2] === undefined) || +(a[key2] === b[key2]) - 1)

  const desc = (a, b) => 
    (+(b[key] > a[key] || a[key] === undefined) || +(b[key] === a[key]) - 1) ||
      (+(b[key2] > a[key2] || a[key2] === undefined) || +(b[key2] === a[key2]) - 1)

  return direction === -1 ? docs.sort(desc) : docs.sort(asc)
}
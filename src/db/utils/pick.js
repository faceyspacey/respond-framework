export default function pick(doc, project) {
  if (!doc) return
  if (!project) return doc
  if (Object.keys(project).length === 0) return doc
  
  const { id, ...proj } = project

  const values = Object.values(proj)

  const isExclude = values.every(field => field === 0)
  const isInclude = values.every(field => field === 1)

  if (!isExclude && !isInclude) {
    throw Error('respond: invalid mongo project: both exclusions + inclusions are provided, however only one kind is allowed')
  }

  if (id !== undefined) {
    proj._id = id
  }

  return isExclude ? exclude(doc, proj) : include(doc, proj)
}


const exclude = (doc, project) =>
  Object.keys(doc).reduce((acc, field) => {
    if (project[field] === 0) return acc
    acc[field] = doc[field]
    return acc
  }, {})



const include = (doc, project) =>
  Object.keys(project).reduce((acc, field) => {
    if (project[field] === 0) return acc // could be _id, which is allowed to be excluded in an include
    acc[field] = doc[field]
    return acc
  }, {})
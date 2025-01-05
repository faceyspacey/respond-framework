export default ({ respond: r, branch, parent }) => {
  const { ignoreParents, dependsOnAllAncestors, dependsOnParent } = r

  if (!ignoreParents) {
    if (dependsOnAllAncestors) {
      r.branchDep = '' 
      r.branchDiff = branch
    }
    else if (dependsOnParent) {
      r.branchDep = parent.respond.branch
      r.branchDiff = r.moduleName
    }
  }

  r.ancestorsListening = {} // includes self

  for (const b of r.ancestors) {
    const respond = r.responds[b]
    const branchDep = respond.branchDep ?? respond.branch

    r.ancestorsListening[branchDep] = true
    
    if (r.responds[b].ignoreParents) break
  }
}
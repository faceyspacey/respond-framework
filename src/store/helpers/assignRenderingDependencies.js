export default ({ respond: r, branch, parent }) => {
  const { ignoreParents, dependsOnAllAncestors, dependsOnParent } = r

  if (!ignoreParents) {
    if (dependsOnAllAncestors) {
      r.dependedBranch = '' 
      r.branchDiff = branch
    }
    else if (dependsOnParent) {
      r.dependedBranch = parent.respond.branch
      r.branchDiff = r.moduleName
    }
  }

  r.ancestorsListening = {} // includes self

  for (const b of r.ancestors) {
    const respond = r.responds[b]
    const dependedBranch = respond.dependedBranch ?? respond.branch

    r.ancestorsListening[dependedBranch] = true
    
    if (r.responds[b].ignoreParents) break
  }
}
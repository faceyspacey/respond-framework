export default ({ affected }, snap, k, trap = defaultTrap) => {
  let used = affected.get(snap)
  
  if (!used) {
    used = {}
    affected.set(snap, used)
  }

  let set = used[trap]

  if (!set) {
    set = new Set()
    used[trap] = set
  }

  set.add(k)
}


const defaultTrap = 'get'
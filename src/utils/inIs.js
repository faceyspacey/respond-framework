export function thisIn(...modulesOrNamespacesOrEvents) {
  return modulesOrNamespacesOrEvents.includes(this)
}

export function is(moduleOrNamespaceOrEvent) {
  return moduleOrNamespaceOrEvent === this
}
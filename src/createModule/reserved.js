export const _parent = Symbol('_parent')
export const _module = Symbol('_module')
export const _top = Symbol('_top')
export const _branch = Symbol('_branch')

export const moduleApi = {
  __esModule: true,
  id: true,
  branch: true,
  branchAbsolute: true,
  moduleKeys: true,
  ignoreParents: true,
  initialState: true,
  components: true,
  events: true,
  selectors: true,
  reducers: true,
  props: true,
  models: true,
  db: true,
  replays: true,
  options: true,
  plugins: true,
  reduce: true,
}
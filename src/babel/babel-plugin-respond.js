const { addNamed } = require('@babel/helper-module-imports')
const p = require('path')


function respondBabelPlugin(babel) {
  const { types: t, template } = babel

  const visited = Symbol('visited')

  const temp = template(`props => {
    const { events, state, store } = USE_RESPOND(SYNC, EVENTS_ONLY)
    return FUNC(props, events, state, store)
  }`)

  const tempWithRef = template(`FORWARD_REF(function NAME(props, ref) {
    const { events, state, store } = USE_RESPOND(SYNC)
    return FUNC(props, events, state, store, ref)
  })`)

  const isComponentCase = name => name[0] === name[0].toUpperCase()

  const isForm = name => name.indexOf('Form') > -1

  const upperCaseFirst = word => word.charAt(0).toUpperCase() + word.slice(1)
  
  const isComponentFile = (fileOpts, opts) => {
    const { root, filename } = fileOpts
    const { directories = ['App', 'components'] } = opts

    // filename is component-cased or an index.js file
    const name = filename.substr(filename.lastIndexOf('/') + 1) 
    const isComponentFile = isComponentCase(name) || name.indexOf('index.') > -1

    if (!isComponentFile) return false

    // filename is nested in a directory designated for transformation
    return !!directories.find(dir => isFileInDir(root, dir, filename))
  }

  const isFileInDir = (root, dir, filename) => {
    const filenameWithRootRemoved = filename.replace(root, '') // eg: /Users/john/company/components/Foo.js -> /components/foo.js
    return filenameWithRootRemoved.indexOf(`/${dir}/`) > -1
  }

  const createRespondImport = (path, dirs, fileOpts, opts) => {
    const { root, filename } = fileOpts

    const depth = dirs.findIndex(d => d === 'modules')

    if (depth === -1) {
      const respondDotJs = opts.package
        ? opts.package + '/' + 'respond.js' // eg: 'respond-package/respond.js'
        : root + '/respond.js'

      return addNamed(path, 'useRespond', respondDotJs, { nameHint: 'useRespond' })
    }
    
    const length = depth - 1 // dir above modules, eg: modules/admin

    const dotdot = Array.from({ length }).map(_ => '..') // eg: ['..', '..']
    let respondDotJs = p.resolve(filename, ...dotdot, 'respond.js')

    if (opts.package) {
      const [_, pathRelativeToPackage] = respondDotJs.split('/src/')
      respondDotJs = opts.package + '/' + pathRelativeToPackage // eg: 'respond-framework/modules/replayTools/respond.js'
    }

    return addNamed(path, 'useRespond', respondDotJs, { nameHint: 'useRespond' })
  }

  const createDefaultExportName = (path, dirs) => {
    const filename = dirs[0]

    if (filename.indexOf('index.') === -1) return
    if (dirs[1] !== 'App') return

    const defaultName = upperCaseFirst(dirs[2]) + 'App'
    if (!defaultName) return

    const index = path.node.body.findIndex(p => p.type === 'ExportDefaultDeclaration')
    if (index === -1) return

    const exportPath = path.get(`body.${index}`)
    if (!t.isArrowFunctionExpression(exportPath.node.declaration)) return

    const { params, body } = exportPath.node.declaration

    const replacement = t.arrowFunctionExpression(params, body)
    const id = t.identifier(defaultName)

    const [varDeclPath] = exportPath.replaceWithMultiple([
      t.variableDeclaration('const', [
        t.variableDeclarator(id, replacement)
      ]),
      t.exportDefaultDeclaration(id)
    ])

    exportPath.scope.registerDeclaration(varDeclPath)
  }

  return {
    visitor: {
      Program(path) {
        const shouldParse = isComponentFile(this.file.opts, this.opts)
        if (!shouldParse) return

        const comment = path.parent.comments[0]
        const message = comment && comment.value.trim()
        
        if (message === 'no-respond') return

        const dirs = this.file.opts.filename.split('/').reverse()

        this.useRespond = createRespondImport(path, dirs, this.file.opts, this.opts)
        createDefaultExportName(path, dirs)
      },

      ArrowFunctionExpression(path) {
        if (!this.useRespond) return
        
        if (path[visited]) return
        path[visited] = true

        const { parent } = path

        if (parent.type !== 'VariableDeclarator') return

        const greatGrandParentPathType = path.parentPath.parentPath.parentPath.type
        if (greatGrandParentPathType !== 'Program' && greatGrandParentPathType !== 'ExportNamedDeclaration') return
        
        const args = path.node.params.length

        if (args < 2) return

        const { name } = parent.id
        if (!isComponentCase(name)) return

        if (args === 5) {
          path.replaceWith(tempWithRef({
            FORWARD_REF: addNamed(path, 'forwardRef', 'react', { nameHint: 'react' }),
            USE_RESPOND: t.cloneDeep(this.useRespond),
            FUNC: path.node,
            SYNC: isForm(name) ? 'true' : 'false',
            NAME: /App\d*$/.test(name) ? this.defaultExportDisplayName : name,
          }))
        }
        else {       
          path.replaceWith(temp({
            USE_RESPOND: t.cloneDeep(this.useRespond),
            FUNC: path.node,
            SYNC: isForm(name) ? 'true' : 'false',
            EVENTS_ONLY: args === 2 ? 'true' : 'false',
          }))
        }
      },
    },
  }
}


module.exports = respondBabelPlugin



// uncomment below to run in quokka

// const code = `
// export default (props, events, state) => null


// // const Hello = (props, events, state) => null

// // const Yolo = (props, events, state, store, ref) => null
// `

// const output = require('@babel/core').transformSync(code, {
//   plugins: [respondBabelPlugin],
//   filename: 'modules/foo/App/index.js'
// })


// output.code.split(';').join(';\n') //?
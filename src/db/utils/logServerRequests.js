export const empty = {}


export const createParameterString = (instance, method, args) => {
  const names = getParamNames(instance, method)
  return names.map((n, i) => `${n} = ${args[i] === '__undefined__' ? 'undefined' : JSON.stringify(args[i])}`).join(', ')
}


export const createResponseString = res => {
  if (res === empty) return '{}'
  if (!res || typeof res !== 'object') return res

  const keys = Object.keys(res)

  if (keys.length === 0) return '{}'

  const pretty = keys.map(k => {
    const v = res[k]
    return v && typeof v === 'object' ? k : `${k}: ${v}`
  }).join(', ') 

  return `{ ${pretty} }`
}


const getParamNames = (instance, method) => {
  if (cache[instance + method]) return cache[instance + method]

  const func = instance[method]

  const str = func.toString().replace(STRIP_COMMENTS, '')
  const result = str.slice(str.indexOf('(')+1, str.indexOf(')')).match(ARGUMENT_NAMES)

  return cache[instance + method] = result === null ? [] : result
}




const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg
const ARGUMENT_NAMES = /([^\s,]+)/g

const cache = {}
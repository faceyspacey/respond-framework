
export default function applySelector(selector) {
  return doc => !selector ? doc : Object.keys(selector).every(k => {
    const s = selector[k]

    const indexOfDot = k.indexOf('.')
    const isNestedDocSelector = indexOfDot > -1


    if (isNestedDocSelector) {
      const k2 = k.slice(0, indexOfDot)
      const kNested = k.slice(indexOfDot + 1) // allow for possibly even deeper nested docs
      const v = doc[k2]


      if (Array.isArray(v)) {
        return v.find(docNested => {
          const subSelector = { [kNested]: s }
          return applySelector(subSelector)(docNested)
        })
      }
      else if (typeof v === 'object') {
        const subSelector = { [kNested]: s }
        const docNested = v
        return applySelector(subSelector)(docNested)
      }

      return false
    }

    const v = doc[k]

    const isObjectSelector = typeof s === 'object' && s
    const isArraySelector = k === '$or' || k === '$and' || k === '$nor'
    const isReg = s instanceof RegExp

    if (isObjectSelector) {
      if (s.hasOwnProperty('$ne'))  return v !== s.$ne

      if (s.$gt !== undefined)  return v >   s.$gt
      if (s.$lt !== undefined)  return v <   s.$lt
      if (s.$gte !== undefined) return v >=  s.$gte
      if (s.$lte !== undefined) return v <=  s.$lte

      if (s.hasOwnProperty('$eq'))  return  applySelector({ [s]: s.$eq })(doc)
      if (s.$not !== undefined) return !applySelector({ [s]: s.$not })(doc)

      if (s.$in)  return  s.$in.find(v2 => v2 === v) !== undefined
      if (s.$nin) return  s.$nin.find(v2 => v2 === v) === undefined

      if (s.$exists !== undefined)  return s.$exists === true ? v !== undefined : v === undefined

      if (s.$size)  return v?.length === s.$size
    }

    if (isArraySelector) {
      if (!Array.isArray(s)) throw new Error(`respond: selector "${k}" must be an array`)

      if (k === '$and') {
        return s.every(subSelector => applySelector(subSelector)(doc))
      }

      if (k === '$or') {
        return s.find(subSelector => applySelector(subSelector)(doc))
      }

      if (k === '$nor') {
        return !s.find(subSelector => applySelector(subSelector)(doc))
      }
    }

    if (isReg) return s.test(v)
  
    return v === s
  })
} 
import { isEqualDeepPartial } from '../../utils/isEqual.js'


export const findAllByProps = (renderer, props) =>
  renderer.root.findAll(el =>
    Object.keys(props).every(k => {
      if (typeof props[k] !== 'object') {
        return el.props[k] === props[k]
      }

      return isEqualDeepPartial(props[k], el.props[k])
    }) 
  )


export const findAllByPropsAndType = (renderer, props, type) =>
  renderer.root.findAll(el =>
    (!type || el.type === type) &&
    (!props || Object.keys(props).every(k => {
        if (typeof props[k] !== 'object') {
          return el.props[k] === props[k]
        }

        return isEqualDeepPartial(props[k], el.props[k])
      }) 
    )
  )


export const findByProps = (renderer, props) =>
  renderer.root.find(el =>
    Object.keys(props).every(k => {
      if (typeof props[k] !== 'object') {
        return el.props[k] === props[k]
      }
      
      return isEqualDeepPartial(props[k], el.props[k])
    })
  )


export const findByPropsAndType = (renderer, props, type) =>
  renderer.root.find(el =>
    (!type || el.type === type) &&
    (!props || Object.keys(props).every(k => {
        if (typeof props[k] !== 'object') {
          return el.props[k] === props[k]
        }
        
        return isEqualDeepPartial(props[k], el.props[k])
      })
    )
  )
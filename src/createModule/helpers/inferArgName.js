export const inferArgName = (response, value) =>
  Object.defineProperty(response, '__argName', { value, enumerable: false }) // automagic: dispatched events with response as arg value will move from eg: arg to arg.user


export const applyArgName = arg =>
  arg?.__argName ? { [arg.__argName]: arg } : arg // applied to e object, and now ready for dispatch

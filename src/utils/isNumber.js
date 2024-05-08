const isNumber = v => !isNaN(parseInt(v))

export default isNumber


export const cleanNumber = v => isNumber(v) ? parseFloat(v) : undefined
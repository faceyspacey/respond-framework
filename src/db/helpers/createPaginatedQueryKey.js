export default ({ skip, ...query } = {}) => JSON.stringify(sort(query))


const sort = (obj = {}) => {
	const keys = Object.keys(obj)
	const next = {}

	keys.sort().forEach(key => next[key] = obj[key])

	return next
}
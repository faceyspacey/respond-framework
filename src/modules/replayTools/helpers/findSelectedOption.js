export default (options, value) =>
  options.find(o => o.value === value) ||
  options.find(o => o.defaultOption) ||
  options.length === 1 && options[0]
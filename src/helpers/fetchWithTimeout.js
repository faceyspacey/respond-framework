export default async (resource, options = {}, timeout = 12000) => {  
  const co = new AbortController()
  const id = setTimeout(() => co.abort(), timeout)

  const response = await fetch(resource, {
    ...options,
    signal: co.signal  
  })

  clearTimeout(id)

  return response
}
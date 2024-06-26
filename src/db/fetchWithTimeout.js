export default async (resource, options = {}, timeout = 12000) => {  
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  const response = await fetch(resource, {
    ...options,
    signal: controller.signal  
  })

  clearTimeout(id)

  return response
}
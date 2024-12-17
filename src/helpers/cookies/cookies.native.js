import AsyncStorage from '@react-native-async-storage/async-storage'


export default () => {
  const cookies = {}

  return {
    async get(k) {
      const value = cookies[k]
      if (value) return value
  
      try {
        return cookies[k] = await AsyncStorage.getItem(k)
      }
      catch {}
    },
    
  
    async set(k, v) {
      cookies[k] = v
  
      try {
        await AsyncStorage.setItem(k, v)
      }
      catch {}
    },
  
  
    async remove(k) {
      delete cookies[k]
  
      try {
        await AsyncStorage.removeItem(k)
      }
      catch {}
    }
  }
}
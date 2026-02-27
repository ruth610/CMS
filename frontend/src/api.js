import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const APP_BASE = import.meta.env.VITE_APP_URL || 'http://localhost:4000'

const api = axios.create({
  baseURL: API_BASE,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cms_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export { api, APP_BASE }

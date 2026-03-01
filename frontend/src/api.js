import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Token ${token}`
  return config
})

// Response interceptor to handle invalid/expired tokens.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    // If unauthorized and we have a token, clear it and retry once without token
    if (
      err.response &&
      (err.response.status === 401 || err.response.status === 403) &&
      original &&
      !original._retry
    ) {
      original._retry = true
      const token = localStorage.getItem('token')
      if (token) {
        localStorage.removeItem('token')
        // remove Authorization header and retry
        delete original.headers.Authorization
        try {
          return api(original)
        } catch (e) {
          return Promise.reject(e)
        }
      }
    }
    return Promise.reject(err)
  }
)

export async function uploadFile(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/upload/', form)
  return data
}

export async function getDataset(id) {
  const { data } = await api.get(`/datasets/${id}/`)
  return data
}

export async function claimDataset(id) {
  const { data } = await api.post(`/datasets/${id}/claim/`)
  return data
}

export async function enhanceDataset(id) {
  const { data } = await api.post(`/datasets/${id}/enhance/`)
  return data
}

export async function downloadEnhancedFile(id, filename) {
  const token = localStorage.getItem('token')
  const res = await fetch(`/api/datasets/${id}/download_enhanced/`, {
    headers: token ? { Authorization: `Token ${token}` } : {},
  })
  if (!res.ok) throw new Error('Download failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'enhanced.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export async function getDashboard() {
  const { data } = await api.get('/dashboard/')
  return data
}

export async function getDatasets() {
  const { data } = await api.get('/datasets/')
  return data
}

export async function registerUser(username, password) {
  const { data } = await api.post('/auth/register/', { username, password })
  return data
}

export async function loginUser(username, password) {
  const { data } = await api.post('/auth/login/', { username, password })
  return data
}

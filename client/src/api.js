import axios from 'axios'
import constantUrls from '../constants/urls.js'

// withCredentials sends the session cookie, so the server knows who is logged in
const api = axios.create({
  baseURL: constantUrls.serverUrl,
  withCredentials: true,
  timeout: 3000,
})

export function errorMessage(error) {
  return error.response?.data?.message ?? error.message
}

export default api

import axios from 'axios'
import constantUrls from '../constants/urls.js'

// withCredentials sends the session cookie, so the server knows who is logged in
const api = axios.create({
  baseURL: constantUrls.serverUrl,
  withCredentials: true,
  // uploads (up to 5 MB) and the OneMap distance lookup need more than a few seconds
  timeout: 15000,
})

export function errorMessage(error) {
  return error.response?.data?.message ?? error.message
}

export default api

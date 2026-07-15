import axios from 'axios'
import { env } from '@/config/env'

/**
 * Shared HTTP client for the future Flask REST API.
 * All domain services (sentimentService, forecastService, tiktokService,
 * twitterService, ...) will build on this instance — UI components never
 * call axios directly.
 *
 * Auth token injection (Firebase) and error normalisation interceptors
 * are added in the backend-integration phases.
 */
export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})


import api from '../lib/api'
import type { DashboardResponse } from '../types/dashboard'

export async function getDashboardSummary() {
  const response = await api.get<DashboardResponse>(
    '/dashboard/summary',
  )

  return response.data.summary
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ComplianceLog {
  id: string
  event: string
  userEmail: string
  details: Record<string, any>
  createdAt: string
}

export default function CompliancePage() {
  const router = useRouter()
  const [logs, setLogs] = useState<ComplianceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/compliance-logs')
      if (!res.ok) throw new Error('Failed to fetch compliance logs')

      const data = await res.json()
      setLogs(data.logs || [])
    } catch (err) {
      setError('Failed to load compliance logs')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getEventBadgeColor = (event: string) => {
    switch (event) {
      case 'tos_accepted':
        return 'bg-green-100 text-green-700'
      case 'privacy_accepted':
        return 'bg-blue-100 text-blue-700'
      case 'data_deletion_requested':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) return <div className="p-8">Loading...</div>
  if (error) return <div className="p-8 text-red-600">{error}</div>

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Compliance & Legal</h1>
        <Link
          href="/admin"
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition"
        >
          Back to Admin Dashboard
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Total Events</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{logs.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">ToS Acceptances</div>
          <div className="text-3xl font-bold text-green-600 mt-2">
            {logs.filter(l => l.event === 'tos_accepted').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Deletion Requests</div>
          <div className="text-3xl font-bold text-red-600 mt-2">
            {logs.filter(l => l.event === 'data_deletion_requested').length}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Event</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">User Email</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEventBadgeColor(log.event)}`}>
                    {log.event.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-gray-900">{log.userEmail}</td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="px-6 py-8 text-center text-gray-500">
            No compliance events found
          </div>
        )}
      </div>
    </div>
  )
}

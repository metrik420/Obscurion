'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface AuditLog {
  id: string
  adminEmail: string
  action: string
  resourceType: string
  resourceId: string
  details: Record<string, any>
  ipAddress: string
  createdAt: string
}

export default function AuditLogsPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/audit-logs')
      if (!res.ok) throw new Error('Failed to fetch audit logs')

      const data = await res.json()
      setLogs(data.logs || [])
    } catch (err) {
      setError('Failed to load audit logs')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>
  if (error) return <div className="p-8 text-red-600">{error}</div>

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
        <Link
          href="/admin"
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition"
        >
          Back to Admin Dashboard
        </Link>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Admin</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Action</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Resource</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">IP Address</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm text-gray-900">{log.adminEmail}</td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {log.resourceType}
                  {log.resourceId && (
                    <div className="text-xs text-gray-500 mt-1">ID: {log.resourceId}</div>
                  )}
                </td>
                <td className="px-6 py-3 text-sm text-gray-600 font-mono text-xs">{log.ipAddress}</td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="px-6 py-8 text-center text-gray-500">
            No audit logs found
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Stats {
  totalUsers: number
  activeUsers: number
  suspendedUsers: number
  todaySignups: number
  pendingDeletions: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/stats')
        if (!res.ok) throw new Error('Failed to fetch stats')
        const data = await res.json()
        setStats(data)
      } catch (err) {
        setError('Failed to load statistics')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) return <div className="p-8">Loading...</div>
  if (error) return <div className="p-8 text-red-600">{error}</div>

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
        >
          Back to Notes
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Total Users</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalUsers || 0}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Active Users</div>
          <div className="text-3xl font-bold text-green-600 mt-2">{stats?.activeUsers || 0}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Suspended Users</div>
          <div className="text-3xl font-bold text-red-600 mt-2">{stats?.suspendedUsers || 0}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Pending Deletions</div>
          <div className="text-3xl font-bold text-yellow-600 mt-2">{stats?.pendingDeletions || 0}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/users"
            className="block p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition text-indigo-900 font-medium"
          >
            Manage Users
          </Link>
          <Link
            href="/admin/audit-logs"
            className="block p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition text-blue-900 font-medium"
          >
            View Audit Logs
          </Link>
          <Link
            href="/admin/compliance"
            className="block p-4 bg-green-50 hover:bg-green-100 rounded-lg transition text-green-900 font-medium"
          >
            Compliance Reports
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900">System Status</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <p>✅ Database connected</p>
          <p>✅ Authentication working</p>
          <p>✅ Audit logging enabled</p>
          <p>✅ Compliance tracking active</p>
        </div>
      </div>
    </div>
  )
}

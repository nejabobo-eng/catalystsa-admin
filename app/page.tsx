'use client'

import { useState, useEffect } from 'react'

interface Order {
  id: number
  order_number: number
  checkout_id: string
  amount: number
  delivery_fee?: number
  total: number
  currency: string
  status: string
  customer_name?: string
  customer_email?: string
  phone?: string
  address?: string
  city?: string
  postal_code?: string
  items?: string
  created_at: string
  paid_at?: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://catalystsa.onrender.com'

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Dashboard state
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Check token on mount
  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    const expiry = localStorage.getItem('admin_token_expiry')

    if (token && expiry && new Date().getTime() < parseInt(expiry)) {
      setIsAuthenticated(true)
      fetchOrders(token)
    }
    setLoading(false)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError('')

    try {
      const res = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword }),
      })

      if (!res.ok) throw new Error('Invalid password')

      const data = await res.json()
      localStorage.setItem('admin_token', data.token)
      localStorage.setItem('admin_token_expiry', String(new Date().getTime() + data.expires_in * 1000))

      setIsAuthenticated(true)
      setLoginPassword('')
      fetchOrders(data.token)
    } catch (error) { setLoginError(error instanceof Error ? error.message : "Login failed")
    } finally {
      setLoginLoading(false)
    }
  }

  async function fetchOrders(token: string, search = '', status = '') {
    setOrdersLoading(true)
    try {
      let url = `${API_URL}/admin/orders?limit=100`
      if (search) url += `&search=${encodeURIComponent(search)}`
      if (status) url += `&status_filter=${encodeURIComponent(status)}`

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Failed to fetch orders')

      const data = await res.json()
      setOrders(data.orders)
      if (selectedOrder && !data.orders.find((o: Order) => o.order_number === selectedOrder.order_number)) {
        setSelectedOrder(null)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setOrdersLoading(false)
    }
  }

  async function fetchOrderDetail(orderNumber: number) {
    const token = localStorage.getItem('admin_token')
    try {
      const res = await fetch(`${API_URL}/admin/orders/${orderNumber}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Failed to fetch order')

      const data = await res.json()
      setSelectedOrder(data)
    } catch (error) {
      console.error('Error fetching order detail:', error)
    }
  }

  async function updateOrderStatus(newStatus: string) {
    if (!selectedOrder) return

    setStatusUpdating(true)
    setStatusMessage('')
    const token = localStorage.getItem('admin_token')

    try {
      const res = await fetch(`${API_URL}/admin/orders/${selectedOrder.order_number}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) throw new Error('Failed to update status')

      setStatusMessage(`✅ Status updated to ${newStatus}`)
      setSelectedOrder({ ...selectedOrder, status: newStatus })
      
      // Refresh orders list
      const currentToken = localStorage.getItem('admin_token')
      if (currentToken) fetchOrders(currentToken, searchQuery, statusFilter)

      setTimeout(() => setStatusMessage(''), 3000)
    } catch (error) {
      setStatusMessage(`❌ Error: ${error instanceof Error ? error.message : 'Update failed'}`)
    } finally {
      setStatusUpdating(false)
    }
  }

  function handleSearch(): void {
    const token = localStorage.getItem('admin_token')
    if (token) fetchOrders(token, searchQuery, statusFilter)
  }

  function handleFilterChange(newStatus: string) {
    setStatusFilter(newStatus)
    const token = localStorage.getItem('admin_token')
    if (token) fetchOrders(token, searchQuery, newStatus)
  }

  function handleLogout(): void {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_token_expiry')
    setIsAuthenticated(false)
    setLoginPassword('')
    setOrders([])
    setSelectedOrder(null)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </main>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold mb-2 text-gray-800">Admin Login</h1>
          <p className="text-gray-600 mb-6">Enter your admin password</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter password"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
              {loginLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Operations Dashboard</h1>
            <p className="text-gray-600">Manage orders and fulfillment</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Orders Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            {/* Filters */}
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Orders</h2>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search by order # or email..."
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button
                    onClick={handleSearch}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                  >
                    Search
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => handleFilterChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Orders List */}
            <div className="overflow-x-auto">
              {ordersLoading ? (
                <div className="p-6 text-center text-gray-600">Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="p-6 text-center text-gray-600">No orders found</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Order #</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Total</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => fetchOrderDetail(order.order_number)}
                        className={`border-b border-gray-200 cursor-pointer transition ${
                          selectedOrder?.order_number === order.order_number
                            ? 'bg-blue-50'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-6 py-4 text-sm font-semibold text-blue-600">#{order.order_number}</td>
                        <td className="px-6 py-4 text-sm text-gray-800">{order.customer_name}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-800">R{order.total.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'paid' ? 'bg-indigo-100 text-indigo-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Order Detail Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow sticky top-8">
            {selectedOrder ? (
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Order #{selectedOrder.order_number}</h3>

                {/* Customer Info */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase">Customer</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-gray-600">Name</p>
                      <p className="font-medium text-gray-800">{selectedOrder.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Email</p>
                      <p className="font-medium text-gray-800 break-all">{selectedOrder.customer_email}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Phone</p>
                      <p className="font-medium text-gray-800">{selectedOrder.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase">Delivery Address</h4>
                  <div className="text-sm space-y-1 text-gray-800">
                    <p>{selectedOrder.address}</p>
                    <p>{selectedOrder.city}, {selectedOrder.postal_code}</p>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase">Order Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">R{((selectedOrder.amount || 0) / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery</span>
                      <span className="font-medium">R{((selectedOrder.delivery_fee || 0) / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="font-semibold text-gray-800">Total</span>
                      <span className="font-bold text-blue-600">R{selectedOrder.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Status Update */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase">Status</h4>
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => updateOrderStatus(e.target.value)}
                    disabled={statusUpdating}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                  </select>

                  {statusMessage && (
                    <div className={`mt-2 px-3 py-2 rounded text-sm ${
                      statusMessage.includes('✅')
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {statusMessage}
                    </div>
                  )}
                </div>

                {/* Timestamps */}
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Created: {new Date(selectedOrder.created_at).toLocaleString()}</p>
                  {selectedOrder.paid_at && <p>Paid: {new Date(selectedOrder.paid_at).toLocaleString()}</p>}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <p>Select an order to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}







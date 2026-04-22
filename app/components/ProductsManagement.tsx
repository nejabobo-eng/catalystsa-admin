'use client'

import { useState, useEffect } from 'react'

interface Product {
  id: number
  name: string
  description?: string
  cost_price: number
  cost_display: string
  price: number
  price_display: string
  markup_percent?: string
  image_url?: string
  stock: number
  active: boolean
  created_at?: string
  updated_at?: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://catalystsa.onrender.com'

export default function ProductsManagement() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [message, setMessage] = useState('')

  // Form state - admin enters COST PRICE, backend calculates selling price
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cost_price: '', // What you pay for it
    image_url: '',
    stock: '0',
    active: true
  })

  // Image upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    setLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`${API_URL}/admin/products?include_inactive=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('Failed to fetch products:', error instanceof Error ? error.message : error)
    } finally {
      setLoading(false)
    }
  }

  function handleEdit(product: Product) {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      cost_price: (product.cost_price / 100).toFixed(2),
      image_url: product.image_url || '',
      stock: product.stock.toString(),
      active: product.active
    })
    setShowForm(true)
  }

  function handleAddNew() {
    setEditingProduct(null)
    setFormData({
      name: '',
      description: '',
      cost_price: '',
      image_url: '',
      stock: '0',
      active: true
    })
    setShowForm(true)
  }

  // Upload helper: uploads file to backend which forwards to Cloudinary
  async function handleImageUpload(file: File): Promise<string | null> {
    setUploadingImage(true)
    setMessage('')
    try {
      const token = localStorage.getItem('admin_token')
      const fd = new FormData()
      fd.append('file', file)

      const res = await fetch(`${API_URL}/admin/upload-image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.detail || 'Upload failed')
      }

      const data = await res.json()
      const url = data?.url || data?.secure_url || data?.data?.url || null
      if (url) {
        setFormData((prev) => ({ ...prev, image_url: url }))
        setMessage('✅ Image uploaded')
        setSelectedFile(null)
        return url
      }

      throw new Error('Invalid upload response')
    } catch (error) {
      setMessage(`❌ ${error instanceof Error ? error.message : 'Upload failed'}`)
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // Ensure image is uploaded before saving (avoid React state timing issues)
      let uploadedUrl: string | null = formData.image_url || null
      if (selectedFile && !formData.image_url) {
        uploadedUrl = await handleImageUpload(selectedFile)
      }

      const token = localStorage.getItem('admin_token')
      const costPriceInCents = Math.round(parseFloat(formData.cost_price) * 100)

      const payload = {
        name: formData.name,
        description: formData.description || null,
        cost_price: costPriceInCents, // Backend will calculate selling price
        image_url: uploadedUrl || null,
        stock: parseInt(formData.stock),
        active: formData.active
      }

      const url = editingProduct
        ? `${API_URL}/admin/products/${editingProduct.id}`
        : `${API_URL}/admin/products`

      const method = editingProduct ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Failed to save product')

      setMessage(editingProduct ? '✅ Product updated' : '✅ Product created with x1.6 markup')
      setShowForm(false)
      fetchProducts()
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Save failed'}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(productId: number) {
    if (!confirm('Deactivate this product?')) return

    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`${API_URL}/admin/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) throw new Error('Failed to delete product')

      setMessage('✅ Product deactivated')
      fetchProducts()
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Delete failed'}`)
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Product Management</h2>
        <button
          onClick={handleAddNew}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Add Product
        </button>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-gray-100 rounded">
          {message}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-xl font-bold mb-4">
            {editingProduct ? 'Edit Product' : 'New Product'}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Cost Price (Rands) *
                <span className="text-xs text-gray-500 ml-2">Selling price = cost × 1.6</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="100.00"
              />
              {formData.cost_price && parseFloat(formData.cost_price) > 0 && (
                <div className="text-xs text-green-600 mt-1">
                  → Selling price will be: R{(parseFloat(formData.cost_price) * 1.6).toFixed(2)}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Stock</label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Image URL</label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="https://example.com/image.jpg"
              />
              {/* Image upload: send file to backend which uploads to Cloudinary */}
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                  className="text-sm"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedFile) return setMessage('❌ Select a file first')
                    await handleImageUpload(selectedFile)
                  }}
                  disabled={uploadingImage}
                  className="bg-gray-800 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 disabled:opacity-60"
                >
                  {uploadingImage ? 'Uploading...' : 'Upload Image'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={3}
            />
          </div>

          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="mr-2"
            />
            <label className="text-sm font-medium">Active</label>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Saving...' : 'Save Product'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && !showForm ? (
        <div className="text-center py-8">Loading products...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selling Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Markup</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {product.image_url && (
                        <img src={product.image_url} alt={product.name} className="w-10 h-10 object-cover rounded mr-3" />
                      )}
                      <div>
                        <div className="font-medium">{product.name}</div>
                        {product.description && (
                          <div className="text-sm text-gray-500">{product.description.substring(0, 50)}...</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.cost_display}</td>
                  <td className="px-6 py-4 text-sm font-semibold">{product.price_display}</td>
                  <td className="px-6 py-4 text-sm text-green-600">{product.markup_percent || '60.0%'}</td>
                  <td className="px-6 py-4 text-sm">{product.stock}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded ${product.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {product.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Edit
                    </button>
                    {product.active && (
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {products.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No products yet. Click "Add Product" to create your first product.
            </div>
          )}
        </div>
      )}
    </div>
  )
}





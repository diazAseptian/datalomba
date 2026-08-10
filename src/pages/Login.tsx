import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import { Trophy, Eye, EyeOff } from 'lucide-react'

const Login: React.FC = () => {
  const { user, loading: authLoading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-600">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-white/30 border-t-white" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/admin" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #dc2626 50%, #ffffff 50%, #ffffff 100%)' }}>
      {/* Overlay agar teks tetap terbaca */}
      <div className="absolute inset-0 bg-black bg-opacity-10" />

      <div className="relative max-w-md w-full space-y-6 z-10">
        {/* Header card */}
        <div className="bg-red-600 rounded-t-2xl px-8 pt-8 pb-6 text-center shadow-xl">
          {/* Bendera */}
          <div className="flex justify-center mb-4">
            <div className="flex flex-col w-16 h-10 rounded-md overflow-hidden shadow-lg border-2 border-white">
              <div className="flex-1 bg-red-700" />
              <div className="flex-1 bg-white" />
            </div>
          </div>
          <Trophy className="mx-auto h-12 w-12 text-yellow-300 mb-3" />
          <h2 className="text-2xl font-extrabold text-white">Admin Login</h2>
          <p className="mt-1 text-sm text-red-200">Sistem Manajemen Lomba 17 Agustus</p>
          <p className="text-xs text-red-300 mt-0.5">Taruna Karya Kampung Ciperang</p>
          {/* Strip dekoratif */}
          <div className="flex mt-4 -mx-8 h-1">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-white opacity-40' : 'bg-red-800'}`} />
            ))}
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-b-2xl px-8 pb-8 pt-6 shadow-xl -mt-1">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Admin
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  placeholder="Password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 text-sm font-bold rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                '🇮🇩 Masuk'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
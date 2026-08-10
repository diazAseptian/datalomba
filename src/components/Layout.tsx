import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTahun, PILIHAN_TAHUN } from '../contexts/TahunContext'
import { LogOut, Trophy, Users, Calendar, Award, Menu, X, BarChart3, ChevronDown } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { signOut, user } = useAuth()
  const { tahunAktif, setTahunAktif } = useTahun()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const navigation = [
    { name: 'Dashboard', href: '/admin/', icon: Trophy },
    { name: 'Data Lomba', href: '/admin/lomba', icon: Calendar },
    { name: 'Data Peserta', href: '/admin/peserta', icon: Users },
    { name: 'Data Juara', href: '/admin/juara', icon: Award },
    { name: 'Statistik Peserta', href: '/admin/statistik', icon: BarChart3 },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="relative bg-red-600 shadow-lg">
        {/* Garis putih bawah header */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white opacity-20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-white hover:bg-red-700"
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              {/* Bendera mini */}
              <div className="flex flex-col w-7 h-5 rounded overflow-hidden shadow-sm flex-shrink-0">
                <div className="flex-1 bg-red-700" />
                <div className="flex-1 bg-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white leading-tight">
                  🏆 Lomba 17 Agustus
                </h1>
                <p className="text-xs text-red-200 hidden sm:block">Taruna Karya Kampung Ciperang</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Selector Tahun */}
              <div className="relative flex items-center">
                <select
                  value={tahunAktif}
                  onChange={(e) => setTahunAktif(parseInt(e.target.value))}
                  className="appearance-none pl-2.5 pr-7 py-1.5 text-xs font-bold rounded-lg bg-white/20 text-white border border-white/30 hover:bg-white/30 focus:outline-none cursor-pointer"
                >
                  {PILIHAN_TAHUN.map(t => (
                    <option key={t} value={t} className="text-gray-900 bg-white">{t}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-1.5 h-3 w-3 text-white/70" />
              </div>
              <span className="text-xs text-red-200 hidden sm:block">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md text-red-600 bg-white hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
        {/* Strip merah putih dekoratif */}
        <div className="flex h-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-white' : 'bg-red-800'}`} />
          ))}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
        <div className="flex gap-4 lg:gap-8">
          {/* Mobile Sidebar Overlay */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)} />
              <nav className="fixed top-0 left-0 bottom-0 w-64 bg-white shadow-xl z-50 pt-4">
                <div className="px-4 py-3 bg-red-600 flex items-center gap-2 mb-4">
                  <div className="flex flex-col w-6 h-4 rounded overflow-hidden">
                    <div className="flex-1 bg-red-700" />
                    <div className="flex-1 bg-white" />
                  </div>
                  <span className="text-white font-bold text-sm">Menu</span>
                </div>
                <div className="px-4">
                  <ul className="space-y-1">
                    {navigation.map((item) => {
                      const Icon = item.icon
                      const isActive = location.pathname === item.href
                      return (
                        <li key={item.name}>
                          <Link
                            to={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                              isActive
                                ? 'bg-red-600 text-white'
                                : 'text-gray-600 hover:bg-red-50 hover:text-red-700'
                            }`}
                          >
                            <Icon className="h-5 w-5 mr-3" />
                            {item.name}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </nav>
            </div>
          )}

          {/* Desktop Sidebar */}
          <nav className="hidden lg:block w-56 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-red-100">
              <div className="bg-red-600 px-4 py-3 flex items-center gap-2">
                <div className="flex flex-col w-6 h-4 rounded overflow-hidden">
                  <div className="flex-1 bg-red-700" />
                  <div className="flex-1 bg-white" />
                </div>
                <span className="text-white font-bold text-sm">Menu</span>
              </div>
              <ul className="p-3 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href
                  return (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                          isActive
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-red-50 hover:text-red-700'
                        }`}
                      >
                        <Icon className="h-5 w-5 mr-3" />
                        {item.name}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </nav>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Layout
import React, { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { User, Trophy, BarChart3, Search } from 'lucide-react'
import Toast, { ToastType } from '../components/Toast'
import { useTahun } from '../contexts/TahunContext'

type PesertaStats = {
  nama: string
  totalLomba: number
  lombaList: string[]
  juara1: number
  juara2: number
  juara3: number
}

const StatistikPeserta: React.FC = () => {
  const { tahunAktif } = useTahun()
  const [stats, setStats] = useState<PesertaStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const showToast = (message: string, type: ToastType) => setToast({ message, type })

  useEffect(() => { fetchStats() }, [tahunAktif])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const [pesertaSnap, lombaSnap] = await Promise.all([
        getDocs(collection(db, 'peserta')),
        getDocs(collection(db, 'lomba')),
      ])
      const lombaMap = new Map(lombaSnap.docs.map(d => [d.id, (d.data() as any).nama as string]))
      const lombaIds = new Set(lombaSnap.docs
        .filter(d => ((d.data() as any).tahun ?? new Date((d.data() as any).tanggal).getFullYear()) === tahunAktif)
        .map(d => d.id))
      const statsMap = new Map<string, PesertaStats>()
      pesertaSnap.docs.forEach(d => {
        const peserta = d.data() as any
        if (!lombaIds.has(peserta.lomba_id)) return  // skip lomba tahun lain
        const nama = peserta.nama
        const lombaName = lombaMap.get(peserta.lomba_id) || 'Unknown'
        if (!statsMap.has(nama)) {
          statsMap.set(nama, { nama, totalLomba: 0, lombaList: [], juara1: 0, juara2: 0, juara3: 0 })
        }
        const stat = statsMap.get(nama)!
        stat.totalLomba++
        stat.lombaList.push(lombaName)
        if (peserta.posisi === 1) stat.juara1++
        else if (peserta.posisi === 2) stat.juara2++
        else if (peserta.posisi === 3) stat.juara3++
      })
      setStats(Array.from(statsMap.values()).sort((a, b) => b.totalLomba - a.totalLomba))
    } catch {
      showToast('Gagal memuat statistik', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filteredStats = stats.filter(s => s.nama.toLowerCase().includes(searchQuery.toLowerCase()))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Statistik Peserta</h1>
        <p className="text-gray-600">Statistik partisipasi dan prestasi peserta tahun {tahunAktif}</p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Cari nama peserta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 w-full sm:w-64"
          />
          <span className="text-sm text-gray-500 whitespace-nowrap">{filteredStats.length} peserta</span>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          {filteredStats.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Belum ada data</h3>
              <p className="mt-1 text-sm text-gray-500">
                Data statistik akan muncul setelah ada peserta yang terdaftar.
              </p>
            </div>
          ) : (
            <div>
              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-4">
                {filteredStats.map((stat, index) => (
                  <div key={stat.nama} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{stat.nama}</h3>
                          <p className="text-sm text-gray-500">{stat.totalLomba} lomba</p>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        {stat.juara1 > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Trophy className="h-3 w-3 mr-1" />
                            {stat.juara1}x 🥇
                          </span>
                        )}
                        {stat.juara2 > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {stat.juara2}x 🥈
                          </span>
                        )}
                        {stat.juara3 > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            {stat.juara3}x 🥉
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Lomba:</span> {stat.lombaList.join(', ')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Peringkat
                      </th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nama Peserta
                      </th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Lomba
                      </th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prestasi
                      </th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Daftar Lomba
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStats.map((stat, index) => (
                      <tr key={stat.nama} className="hover:bg-gray-50">
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                          <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="h-5 w-5 text-gray-400 mr-3" />
                            <div className="text-sm font-medium text-gray-900">
                              {stat.nama}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {stat.totalLomba} lomba
                          </span>
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-1">
                            {stat.juara1 > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <Trophy className="h-3 w-3 mr-1" />
                                {stat.juara1}x 🥇
                              </span>
                            )}
                            {stat.juara2 > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {stat.juara2}x 🥈
                              </span>
                            )}
                            {stat.juara3 > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                {stat.juara3}x 🥉
                              </span>
                            )}
                            {stat.juara1 === 0 && stat.juara2 === 0 && stat.juara3 === 0 && (
                              <span className="text-xs text-gray-500">Belum juara</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 lg:px-6 py-4">
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {stat.lombaList.join(', ')}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StatistikPeserta
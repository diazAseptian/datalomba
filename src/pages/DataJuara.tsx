import React, { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore'
import { db, Lomba, Peserta as PesertaType, Grup } from '../lib/firebase'
import { Download, Trophy, Filter } from 'lucide-react'
import { useTahun } from '../contexts/TahunContext'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import Toast, { ToastType } from '../components/Toast'

type Peserta = PesertaType

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

const DataJuara: React.FC = () => {
  const [peserta, setPeserta] = useState<Peserta[]>([])
  const [lomba, setLomba] = useState<Lomba[]>([])
  const [groups, setGroups] = useState<Grup[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ lomba_id: '', grup_id: '', posisi: '' })
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const { tahunAktif } = useTahun()

  const showToast = (message: string, type: ToastType) => setToast({ message, type })

  useEffect(() => { fetchData() }, [tahunAktif])
  useEffect(() => { fetchPeserta() }, [filters])

  const fetchData = async () => {
    setLoading(true)
    try {
      const lombaSnap = await getDocs(query(collection(db, 'lomba'), orderBy('nama')))
      const lombaList = lombaSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Lomba))
        .filter(l => ((l as any).tahun ?? new Date(l.tanggal).getFullYear()) === tahunAktif)
      setLomba(lombaList)
      setFilters({ lomba_id: '', grup_id: '', posisi: '' })
      await fetchPeserta(lombaList)
    } catch {
      showToast('Gagal memuat data', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!filters.lomba_id) {
      setGroups([])
      setFilters(prev => ({ ...prev, grup_id: '' }))
      return
    }
    getDocs(query(collection(db, 'grup'), where('lomba_id', '==', filters.lomba_id), orderBy('nama')))
      .then(snap => setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as Grup))))
    setFilters(prev => ({ ...prev, grup_id: '' }))
  }, [filters.lomba_id])

  const fetchPeserta = async (lombaList?: Lomba[]) => {
    try {
      const snap = await getDocs(query(collection(db, 'peserta'), where('posisi', '>', 0)))
      // Ambil semua grup sekaligus agar nama grup selalu muncul
      const grupSnap = await getDocs(collection(db, 'grup'))
      const grupMap = new Map(grupSnap.docs.map(d => [d.id, (d.data() as any).nama as string]))

      const currentLomba = lombaList || lomba
      const lombaMap = new Map(currentLomba.map(l => [l.id, l.nama]))

      let result = snap.docs.map(d => {
        const data = { id: d.id, ...d.data() } as Peserta
        data.lomba = lombaMap.has(data.lomba_id) ? { nama: lombaMap.get(data.lomba_id)! } : undefined
        data.grup = data.grup_id && grupMap.has(data.grup_id) ? { nama: grupMap.get(data.grup_id)! } : undefined
        return data
      })

      // Hanya tampilkan peserta dari lomba tahun aktif
      result = result.filter(p => p.lomba !== undefined)

      if (filters.lomba_id) result = result.filter(p => p.lomba_id === filters.lomba_id)
      if (filters.grup_id) result = result.filter(p => p.grup_id === filters.grup_id)
      if (filters.posisi) result = result.filter(p => p.posisi === parseInt(filters.posisi))

      result.sort((a, b) => (a.grup?.nama || '').localeCompare(b.grup?.nama || '') || a.posisi - b.posisi)
      setPeserta(result)
    } catch {
      showToast('Gagal memuat data juara', 'error')
    }
  }

  const getPosisiText = (posisi: number) => {
    switch (posisi) {
      case 1: return 'Juara 1'
      case 2: return 'Juara 2'
      case 3: return 'Juara 3'
      default: return 'Belum Juara'
    }
  }

  const getPosisiColor = (posisi: number) => {
    switch (posisi) {
      case 1: return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 2: return 'bg-gray-100 text-gray-800 border-gray-200'
      case 3: return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const exportToPDF = () => {
    try {
      const doc = new jsPDF()
      
      // Add title
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Daftar Juara Lomba 17 Agustus', 105, 20, { align: 'center' })
      
      // Add subtitle
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text('Taruna Karya Kampung Ciperang', 105, 30, { align: 'center' })
      doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 105, 40, { align: 'center' })

      let currentY = 60
      const rowHeight = 8
      const groupSpacing = 15
      
      // Group data by grup
      const groupedData = peserta.reduce((acc, item) => {
        const grupKey = item.grup?.nama || 'Tanpa Grup'
        if (!acc[grupKey]) acc[grupKey] = []
        acc[grupKey].push(item)
        return acc
      }, {} as Record<string, typeof peserta>)

      // Sort groups numerically (Grup 1, Grup 2, etc.)
      const sortedGroups = Object.keys(groupedData).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 999
        const numB = parseInt(b.replace(/\D/g, '')) || 999
        return numA - numB
      })
      
      sortedGroups.forEach((grupNama) => {
        const grupPeserta = groupedData[grupNama].sort((a, b) => a.posisi - b.posisi)
        
        // Check if we need a new page
        if (currentY > 250) {
          doc.addPage()
          currentY = 20
        }
        
        // Group header
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text(`Grup: ${grupNama}`, 15, currentY)
        currentY += 10
        
        // Table header for this group
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text('No', 20, currentY)
        doc.text('Nama Peserta', 35, currentY)
        doc.text('Lomba', 90, currentY)
        doc.text('Juara', 140, currentY)
        
        // Header line
        doc.line(15, currentY + 2, 185, currentY + 2)
        currentY += 8
        
        // Group data
        doc.setFont('helvetica', 'normal')
        grupPeserta.forEach((item, index) => {
          if (currentY > 270) {
            doc.addPage()
            currentY = 20
          }
          
          const truncateText = (text: string, maxLength: number) => {
            return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text
          }
          
          doc.text((index + 1).toString(), 20, currentY)
          doc.text(truncateText(item.nama || '', 25), 35, currentY)
          doc.text(truncateText(item.lomba?.nama || '-', 22), 90, currentY)
          doc.text(getPosisiText(item.posisi), 140, currentY)
          
          currentY += rowHeight
        })
        
        currentY += groupSpacing
      })

      doc.save('daftar-juara-per-grup.pdf')
      showToast('PDF berhasil diexport', 'success')
    } catch (error) {
      console.error('Error generating PDF:', error)
      showToast('Gagal membuat PDF. Silakan coba lagi.', 'error')
    }
  }

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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Juara</h1>
          <p className="text-gray-600">Daftar pemenang lomba 17 Agustus {tahunAktif}</p>
        </div>
        <button
          onClick={exportToPDF}
          disabled={peserta.length === 0}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
        >
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter Lomba
              </label>
              <select
                value={filters.lomba_id}
                onChange={(e) => setFilters({ ...filters, lomba_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Semua Lomba</option>
                {lomba.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nama}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter Grup
              </label>
              <select
                value={filters.grup_id}
                onChange={(e) => setFilters({ ...filters, grup_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                disabled={!filters.lomba_id}
              >
                <option value="">Semua Grup</option>
                {groups.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nama}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter Posisi
              </label>
              <select
                value={filters.posisi}
                onChange={(e) => setFilters({ ...filters, posisi: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Semua Posisi</option>
                <option value="1">Juara 1</option>
                <option value="2">Juara 2</option>
                <option value="3">Juara 3</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          {peserta.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {filters.lomba_id || filters.grup_id || filters.posisi ? 'Tidak ada juara sesuai filter' : 'Belum ada juara'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {filters.lomba_id || filters.grup_id || filters.posisi
                  ? 'Coba ubah filter untuk melihat data lain.'
                  : 'Juara akan muncul setelah ada peserta yang mendapat posisi.'
                }
              </p>
            </div>
          ) : (
            <>
            {/* Mobile Card View */}
            <div className="block sm:hidden space-y-4">
              {peserta.map((item, index) => (
                <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-medium mr-2">
                        {index + 1}
                      </div>
                      <Trophy className="h-4 w-4 text-yellow-500 mr-2" />
                      <span className="font-medium text-gray-900">{item.nama}</span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPosisiColor(item.posisi)}`}>
                      <Trophy className="h-3 w-3 mr-1" />
                      {getPosisiText(item.posisi)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div><span className="font-medium">Lomba:</span> {item.lomba?.nama || '-'}</div>
                    <div><span className="font-medium">Grup:</span> {item.grup?.nama || '-'}</div>
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
                      No
                    </th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nama Peserta
                    </th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lomba
                    </th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grup
                    </th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Juara
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {peserta.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Trophy className="h-5 w-5 text-yellow-500 mr-3" />
                          <div className="text-sm font-medium text-gray-900">
                            {item.nama}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.lomba?.nama || '-'}
                      </td>
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.grup?.nama || '-'}
                      </td>
                      <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getPosisiColor(item.posisi)}`}>
                          <Trophy className="h-3 w-3 mr-1" />
                          {getPosisiText(item.posisi)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default DataJuara
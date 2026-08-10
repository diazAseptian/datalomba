import React, { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore'
import { db, Lomba } from '../lib/firebase'
import { Plus, Edit, Trash2, Calendar, MapPin, Eye, EyeOff } from 'lucide-react'
import { useTahun, PILIHAN_TAHUN } from '../contexts/TahunContext'
import Toast, { ToastType } from '../components/Toast'
import ConfirmDialog from '../components/ConfirmDialog'

const tahunSekarang = new Date().getFullYear()

const DataLomba: React.FC = () => {
  const [lomba, setLomba] = useState<Lomba[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ nama: '', tanggal: '', lokasi: '' })
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const { tahunAktif } = useTahun()

  const showToast = (message: string, type: ToastType) => setToast({ message, type })

  useEffect(() => { fetchLomba() }, [tahunAktif])

  const fetchLomba = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'lomba'), orderBy('tanggal', 'asc')))
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Lomba))
      setLomba(all.filter(l => ((l as any).tahun ?? new Date(l.tanggal).getFullYear()) === tahunAktif))
    } catch {
      showToast('Gagal memuat data lomba', 'error')
    } finally {
      setLoading(false)
    }
  }

  const toTitleCase = (str: string) =>
    str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const namaFormatted = toTitleCase(formData.nama.trim())
      const isDuplicate = lomba.some(
        l => l.nama.toLowerCase() === namaFormatted.toLowerCase() && l.id !== editingId
      )
      if (isDuplicate) {
        showToast(`Lomba "${namaFormatted}" sudah ada`, 'error')
        return
      }
      const tahunLomba = tahunAktif
      if (editingId) {
        await updateDoc(doc(db, 'lomba', editingId), {
          nama: namaFormatted, tanggal: formData.tanggal,
          lokasi: formData.lokasi || null, tahun: tahunLomba,
        })
        showToast('Lomba berhasil diupdate', 'success')
      } else {
        await addDoc(collection(db, 'lomba'), {
          nama: namaFormatted, tanggal: formData.tanggal,
          lokasi: formData.lokasi || null, tahun: tahunLomba,
          tampil: true, created_at: new Date().toISOString(),
        })
        showToast('Lomba berhasil ditambahkan', 'success')
      }
      resetForm()
      fetchLomba()
    } catch {
      showToast('Gagal menyimpan data lomba', 'error')
    }
  }

  const handleEdit = (item: Lomba) => {
    setFormData({
      nama: item.nama, tanggal: item.tanggal,
      lokasi: item.lokasi || '',
      tahun: (item as any).tahun || new Date(item.tanggal).getFullYear(),
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'lomba', id))
      showToast('Lomba berhasil dihapus', 'success')
      fetchLomba()
    } catch {
      showToast('Gagal menghapus lomba', 'error')
    } finally {
      setConfirmDelete(null)
    }
  }

  const toggleTampil = async (item: Lomba) => {
    try {
      await updateDoc(doc(db, 'lomba', item.id), { tampil: !(item.tampil ?? true) })
      showToast(`Lomba ${!(item.tampil ?? true) ? 'ditampilkan' : 'disembunyikan'} di landing page`, 'success')
      fetchLomba()
    } catch {
      showToast('Gagal mengubah visibilitas', 'error')
    }
  }

  const resetForm = () => {
    setFormData({ nama: '', tanggal: '', lokasi: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const lombaFiltered = lomba

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
      {confirmDelete && (
        <ConfirmDialog
          message="Yakin ingin menghapus lomba ini? Data peserta terkait tidak akan terhapus."
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Lomba</h1>
          <p className="text-gray-600">Kelola data lomba 17 Agustus {tahunAktif}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" /> Tambah Lomba
        </button>
      </div>

      {/* FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {editingId ? 'Edit Lomba' : 'Tambah Lomba Baru'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lomba</label>
                <input
                  type="text" required value={formData.nama}
                  onChange={(e) => {
                    const val = e.target.value
                    setFormData({ ...formData, nama: val.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()) })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Masukkan nama lomba"
                />
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                  <input
                    type="date" required value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
                <input
                  type="text" value={formData.lokasi}
                  onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Masukkan lokasi lomba"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="submit" className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700">
                  {editingId ? 'Update' : 'Simpan'}
                </button>
                <button type="button" onClick={resetForm} className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TABEL */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          {lombaFiltered.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Belum ada lomba</h3>
              <p className="mt-1 text-sm text-gray-500">Mulai dengan menambahkan lomba baru.</p>
            </div>
          ) : (
            <div>
              {/* Mobile */}
              <div className="block sm:hidden space-y-4">
                {lombaFiltered.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-red-600" />
                        <h3 className="font-medium text-gray-900">{item.nama}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(item)} className="p-2 text-blue-600 hover:bg-blue-100 rounded">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => setConfirmDelete(item.id)} className="p-2 text-red-600 hover:bg-red-100 rounded">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {item.lokasi || '-'}
                      </div>
                      <div className="pt-1">
                        <button
                          onClick={() => toggleTampil(item)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            (item.tampil ?? true) ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}
                        >
                          {(item.tampil ?? true) ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          {(item.tampil ?? true) ? 'Tampil di Landing Page' : 'Disembunyikan'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Lomba</th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lokasi</th>
                      <th className="px-3 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Landing Page</th>
                      <th className="px-3 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {lombaFiltered.map((item) => (
                      <tr key={item.id} className={`hover:bg-gray-50 ${((item as any).tahun || new Date(item.tanggal).getFullYear()) !== tahunAktif ? 'opacity-60' : ''}`}>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                            <div className="text-sm font-medium text-gray-900">{item.nama}</div>
                          </div>
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500">
                            <MapPin className="h-4 w-4 mr-2" />{item.lokasi || '-'}
                          </div>
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => toggleTampil(item)}
                            title={(item.tampil ?? true) ? 'Sembunyikan dari landing page' : 'Tampilkan di landing page'}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                              (item.tampil ?? true)
                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                            }`}
                          >
                            {(item.tampil ?? true) ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            {(item.tampil ?? true) ? 'Tampil' : 'Disembunyikan'}
                          </button>
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-900">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button onClick={() => setConfirmDelete(item.id)} className="text-red-600 hover:text-red-900">
                            <Trash2 className="h-4 w-4" />
                          </button>
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

export default DataLomba

import React, { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, writeBatch } from 'firebase/firestore'
import { db, Lomba, Peserta as PesertaType, Grup } from '../lib/firebase'
import { Plus, Edit, Trash2, User, Trophy, Filter, Users, Shuffle, Search } from 'lucide-react'
import { useTahun } from '../contexts/TahunContext'
import Toast, { ToastType } from '../components/Toast'
import ConfirmDialog from '../components/ConfirmDialog'

type Peserta = PesertaType

const DataPeserta: React.FC = () => {
  const [peserta, setPeserta] = useState<Peserta[]>([])
  const [lomba, setLomba] = useState<Lomba[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedLomba, setSelectedLomba] = useState<string>('')
  const [viewMode, setViewMode] = useState<'table' | 'groups'>('table')
  const [grupSize, setGrupSize] = useState<number>(3)
  const [groups, setGroups] = useState<Grup[]>([])
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingPesertaId, setEditingPesertaId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [formData, setFormData] = useState({ nama: '', lomba_id: '', posisi: 0 })
  const { tahunAktif } = useTahun()

  const [autocomplete, setAutocomplete] = useState<string[]>([])
  const [showAutocomplete, setShowAutocomplete] = useState(false)

  const showToast = (message: string, type: ToastType) => setToast({ message, type })

  const toTitleCase = (str: string) =>
    str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase())

  const uniqueNames = Array.from(new Set(peserta.map(p => p.nama))).sort()

  const handleNamaChange = (value: string) => {
    const formatted = toTitleCase(value)
    setFormData({ ...formData, nama: formatted })
    if (value.trim().length > 0) {
      const suggestions = uniqueNames.filter(n =>
        n.toLowerCase().includes(value.toLowerCase()) && n.toLowerCase() !== value.toLowerCase()
      )
      setAutocomplete(suggestions.slice(0, 5))
      setShowAutocomplete(suggestions.length > 0)
    } else {
      setShowAutocomplete(false)
    }
  }

  const selectAutocomplete = (name: string) => {
    setFormData({ ...formData, nama: name })
    setShowAutocomplete(false)
  }

  useEffect(() => { fetchData() }, [tahunAktif])

  const fetchData = async () => {
    try {
      const [pesertaSnap, lombaSnap] = await Promise.all([
        getDocs(query(collection(db, 'peserta'), orderBy('created_at', 'desc'))),
        getDocs(query(collection(db, 'lomba'), orderBy('nama'))),
      ])
      const lombaList = lombaSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Lomba))
        .filter(l => ((l as any).tahun ?? new Date(l.tanggal).getFullYear()) === tahunAktif)
      const lombaMap = new Map(lombaList.map(l => [l.id, l.nama]))
      const lombaIds = new Set(lombaList.map(l => l.id))
      const pesertaList = pesertaSnap.docs
        .map(d => {
          const data = { id: d.id, ...d.data() } as Peserta
          data.lomba = lombaMap.has(data.lomba_id) ? { nama: lombaMap.get(data.lomba_id)! } : undefined
          return data
        })
        .filter(p => lombaIds.has(p.lomba_id))
      setPeserta(pesertaList)
      setLomba(lombaList)
      setSelectedLomba('')
    } catch {
      showToast('Gagal memuat data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchGroups = async () => {
    if (!selectedLomba) {
      setGroups([])
      setGroupsLoading(false)
      return
    }
    setGroupsLoading(true)
    try {
      const snap = await getDocs(query(collection(db, 'grup'), where('lomba_id', '==', selectedLomba)))
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as Grup)).sort((a, b) => a.nama.localeCompare(b.nama)))
    } catch {
      showToast('Gagal memuat grup', 'error')
    } finally {
      setGroupsLoading(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [selectedLomba])

  const filteredPeserta = (selectedLomba ? peserta.filter(p => p.lomba_id === selectedLomba) : peserta)
    .filter(p => p.nama.toLowerCase().includes(searchQuery.toLowerCase()))

  const generateGroups = async () => {
    if (!selectedLomba) return
    try {
      const participants = [...filteredPeserta]
      for (let i = participants.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [participants[i], participants[j]] = [participants[j], participants[i]]
      }
      const existingGroups = await getDocs(query(collection(db, 'grup'), where('lomba_id', '==', selectedLomba)))
      const batch1 = writeBatch(db)
      existingGroups.docs.forEach(d => batch1.delete(d.ref))
      await batch1.commit()
      const pesertaSnap = await getDocs(query(collection(db, 'peserta'), where('lomba_id', '==', selectedLomba)))
      const batch2 = writeBatch(db)
      pesertaSnap.docs.forEach(d => batch2.update(d.ref, { grup_id: null }))
      await batch2.commit()
      let groupNumber = 1
      while (participants.length > 0) {
        const size = participants.length === 1 ? 1 : Math.min(grupSize, participants.length)
        const newGroupRef = await addDoc(collection(db, 'grup'), { nama: `Grup ${groupNumber}`, lomba_id: selectedLomba, created_at: new Date().toISOString() })
        const anggota = participants.splice(0, size)
        const batch3 = writeBatch(db)
        anggota.forEach(p => batch3.update(doc(db, 'peserta', p.id), { grup_id: newGroupRef.id }))
        await batch3.commit()
        groupNumber++
      }
      showToast('Grup berhasil diacak', 'success')
      fetchGroups()
      fetchData()
    } catch {
      showToast('Gagal mengacak grup', 'error')
    }
  }

  const createNewGroup = async () => {
    if (!newGroupName.trim() || !selectedLomba) return
    try {
      if (editingGroupId) {
        await updateDoc(doc(db, 'grup', editingGroupId), { nama: newGroupName })
        showToast('Grup berhasil diupdate', 'success')
      } else {
        await addDoc(collection(db, 'grup'), { nama: newGroupName, lomba_id: selectedLomba, created_at: new Date().toISOString() })
        showToast('Grup berhasil dibuat', 'success')
      }
      setNewGroupName('')
      setEditingGroupId(null)
      setShowGroupForm(false)
      fetchGroups()
    } catch {
      showToast('Gagal menyimpan grup', 'error')
    }
  }

  const handleEditGroup = (grup: Grup) => {
    setNewGroupName(grup.nama)
    setEditingGroupId(grup.id)
    setShowGroupForm(true)
  }

  const handleEditPosisi = (peserta: Peserta) => {
    setEditingPesertaId(peserta.id)
  }

  const updatePosisiInline = async (pesertaId: string, posisi: number) => {
    try {
      await updateDoc(doc(db, 'peserta', pesertaId), { posisi })
      fetchData()
    } catch {
      showToast('Gagal mengupdate posisi', 'error')
    }
  }

  const assignToGroup = async (pesertaId: string, grupId: string) => {
    try {
      await updateDoc(doc(db, 'peserta', pesertaId), { grup_id: grupId })
      fetchData()
    } catch {
      showToast('Gagal memindahkan peserta', 'error')
    }
  }

  const removeFromGroup = async (pesertaId: string) => {
    try {
      await updateDoc(doc(db, 'peserta', pesertaId), { grup_id: null })
      fetchData()
    } catch {
      showToast('Gagal mengeluarkan peserta dari grup', 'error')
    }
  }

  const deleteGroup = async (grupId: string) => {
    try {
      const snap = await getDocs(query(collection(db, 'peserta'), where('grup_id', '==', grupId)))
      const batch = writeBatch(db)
      snap.docs.forEach(d => batch.update(d.ref, { grup_id: null }))
      batch.delete(doc(db, 'grup', grupId))
      await batch.commit()
      showToast('Grup berhasil dihapus', 'success')
      fetchGroups()
      fetchData()
    } catch {
      showToast('Gagal menghapus grup', 'error')
    }
  }

  const getGroupedPeserta = () => {
    const grouped: {[key: string]: Peserta[]} = {}
    const unassigned: Peserta[] = []
    
    // Initialize groups
    groups.forEach(group => {
      grouped[group.id] = []
    })
    
    // Assign peserta to groups
    filteredPeserta.forEach(peserta => {
      if (peserta.grup_id && grouped[peserta.grup_id]) {
        grouped[peserta.grup_id].push(peserta)
      } else {
        unassigned.push(peserta)
      }
    })
    
    return { grouped, unassigned }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const namaFormatted = toTitleCase(formData.nama.trim())
      const isDuplicate = peserta.some(
        p => p.nama.toLowerCase() === namaFormatted.toLowerCase()
          && p.lomba_id === formData.lomba_id
          && p.id !== editingId
      )
      if (isDuplicate) {
        showToast(`"${namaFormatted}" sudah terdaftar di lomba ini`, 'error')
        return
      }
      if (editingId) {
        await updateDoc(doc(db, 'peserta', editingId), { ...formData, nama: namaFormatted })
        showToast('Peserta berhasil diupdate', 'success')
      } else {
        await addDoc(collection(db, 'peserta'), { ...formData, nama: namaFormatted, created_at: new Date().toISOString() })
        showToast('Peserta berhasil ditambahkan', 'success')
      }
      setFormData({ nama: '', lomba_id: '', posisi: 0 })
      setEditingId(null)
      setShowForm(false)
      fetchData()
    } catch {
      showToast('Gagal menyimpan data peserta', 'error')
    }
  }

  const handleEdit = (item: Peserta) => {
    setFormData({
      nama: item.nama,
      lomba_id: item.lomba_id,
      posisi: item.posisi,
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'peserta', id))
      showToast('Peserta berhasil dihapus', 'success')
      fetchData()
    } catch {
      showToast('Gagal menghapus peserta', 'error')
    } finally {
      setConfirmDelete(null)
    }
  }

  const resetForm = () => {
    setFormData({ nama: '', lomba_id: '', posisi: 0 })
    setEditingId(null)
    setShowForm(false)
    setShowAutocomplete(false)
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
      case 1: return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
      case 2: return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
      case 3: return 'bg-orange-100 text-orange-800 hover:bg-orange-200'
      default: return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
    }
  }

  const getPosisiIcon = (posisi: number) => {
    switch (posisi) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return '—'
    }
  }

  const PosisiDropdown = ({ id, posisi }: { id: string; posisi: number }) => (
    <div className="relative inline-flex items-center gap-1">
      <span className="text-base leading-none">{getPosisiIcon(posisi)}</span>
      <select
        value={posisi}
        onChange={(e) => updatePosisiInline(id, parseInt(e.target.value))}
        title="Klik untuk ubah posisi"
        className={`appearance-none pl-2 pr-6 py-1 text-xs font-semibold rounded-full border border-transparent cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-400 ${getPosisiColor(posisi)}`}
      >
        <option value={0}>Belum Juara</option>
        <option value={1}>Juara 1</option>
        <option value={2}>Juara 2</option>
        <option value={3}>Juara 3</option>
      </select>
      <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )

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
          message="Yakin ingin menghapus peserta ini?"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Peserta</h1>
          <p className="text-gray-600">Kelola data peserta lomba {tahunAktif}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setViewMode(viewMode === 'table' ? 'groups' : 'table')}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            {viewMode === 'table' ? <Users className="h-4 w-4 mr-2" /> : <Filter className="h-4 w-4 mr-2" />}
            {viewMode === 'table' ? 'Lihat Grup' : 'Lihat Tabel'}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Tambah Peserta
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Filter Lomba:</label>
            <select
              value={selectedLomba}
              onChange={(e) => setSelectedLomba(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="">Semua Lomba</option>
              {lomba.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nama}
                </option>
              ))}
            </select>
          </div>
          
          {viewMode === 'groups' && selectedLomba && (
            <>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">Ukuran Grup:</label>
                <select
                  value={grupSize}
                  onChange={(e) => setGrupSize(parseInt(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value={2}>2 Orang</option>
                  <option value={3}>3 Orang</option>
                  <option value={4}>4 Orang</option>
                </select>
              </div>
              <button
                onClick={generateGroups}
                className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Shuffle className="h-4 w-4 mr-1" />
                Acak Otomatis
              </button>
              <button
                onClick={() => setShowGroupForm(true)}
                className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Plus className="h-4 w-4 mr-1" />
                Buat Grup
              </button>
            </>
          )}
          
          {viewMode === 'groups' && !selectedLomba && (
            <div className="text-sm text-red-600">
              Pilih lomba terlebih dahulu untuk mengelola grup
            </div>
          )}
          
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Search className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Cari nama peserta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 w-full sm:w-48"
            />
          </div>

          <div className="text-sm text-gray-500">
            Total: {filteredPeserta.length} peserta
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {editingId ? 'Edit Peserta' : 'Tambah Peserta Baru'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Peserta
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={formData.nama}
                    onChange={(e) => handleNamaChange(e.target.value)}
                    onBlur={() => setTimeout(() => setShowAutocomplete(false), 150)}
                    onFocus={() => formData.nama && handleNamaChange(formData.nama)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Masukkan nama peserta"
                  />
                  {showAutocomplete && (
                    <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
                      {autocomplete.map((name) => (
                        <li
                          key={name}
                          onMouseDown={() => selectAutocomplete(name)}
                          className="px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 cursor-pointer flex items-center gap-2"
                        >
                          <User className="h-3 w-3 text-gray-400" />
                          {name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lomba
                </label>
                <select
                  required
                  value={formData.lomba_id}
                  onChange={(e) => setFormData({ ...formData, lomba_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">Pilih Lomba</option>
                  {lomba.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Posisi Juara
                </label>
                <select
                  value={formData.posisi}
                  onChange={(e) => setFormData({ ...formData, posisi: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value={0}>Belum Juara</option>
                  <option value={1}>Juara 1</option>
                  <option value={2}>Juara 2</option>
                  <option value={3}>Juara 3</option>
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {editingId ? 'Update' : 'Simpan'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content */}
      {viewMode === 'table' ? (
        /* Table View */
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            {filteredPeserta.length === 0 ? (
              <div className="text-center py-12">
                <User className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {selectedLomba ? 'Tidak ada peserta untuk lomba ini' : 'Belum ada peserta'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedLomba ? 'Pilih lomba lain atau tambahkan peserta baru.' : 'Mulai dengan menambahkan peserta baru.'}
                </p>
              </div>
            ) : (
              <div>
                {/* Mobile Card View */}
                <div className="block sm:hidden space-y-4">
                  {filteredPeserta.map((item) => (
                    <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <User className="h-5 w-5 text-red-600 mr-2" />
                          <h3 className="font-medium text-gray-900">{item.nama}</h3>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button onClick={() => setConfirmDelete(item.id)} className="p-2 text-red-600 hover:bg-red-100 rounded">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div><span className="font-medium">Lomba:</span> {item.lomba?.nama || '-'}</div>
                        <div className="flex items-center">
                          <span className="font-medium mr-2">Status:</span>
                          <PosisiDropdown id={item.id} posisi={item.posisi} />
                        </div>
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
                          Nama
                        </th>
                        <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Lomba
                        </th>
                        <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Posisi Juara
                        </th>
                        <th className="px-3 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredPeserta.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <User className="h-5 w-5 text-gray-400 mr-3" />
                              <div className="text-sm font-medium text-gray-900">
                                {item.nama}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.lomba?.nama || '-'}
                          </td>
                          <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                            <PosisiDropdown id={item.id} posisi={item.posisi} />
                          </td>
                          <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-blue-600 hover:text-blue-900"
                            >
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
      ) : (
        /* Groups View */
        <div className="space-y-4">
          {!selectedLomba ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Filter className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Pilih Lomba</h3>
              <p className="mt-1 text-sm text-gray-500">
                Pilih lomba terlebih dahulu untuk mengelola grup peserta.
              </p>
            </div>
          ) : filteredPeserta.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada peserta</h3>
              <p className="mt-1 text-sm text-gray-500">
                Tambahkan peserta untuk lomba ini terlebih dahulu.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Groups */}
              <div className="lg:col-span-3">
                {groupsLoading ? (
                  <div className="bg-white rounded-lg shadow p-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">Memuat grup...</p>
                  </div>
                ) : groups.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-12 text-center">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Belum ada grup</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Klik "Buat Grup" atau "Acak Otomatis" untuk membuat grup.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groups.map((grup) => {
                      const { grouped } = getGroupedPeserta()
                      const anggotaGrup = grouped[grup.id] || []
                      
                      return (
                        <div key={grup.id} className="bg-white rounded-lg shadow p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-medium text-gray-900 flex items-center">
                              <Users className="h-5 w-5 text-red-600 mr-2" />
                              {grup.nama}
                            </h3>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-500">
                                {anggotaGrup.length} orang
                              </span>
                              <button
                                onClick={() => handleEditGroup(grup)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deleteGroup(grup.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2 min-h-[100px]">
                            {anggotaGrup.length === 0 ? (
                              <div className="text-center py-4 text-gray-500 text-sm">
                                Belum ada anggota
                              </div>
                            ) : (
                              anggotaGrup.map((anggota, index) => (
                                <div key={anggota.id} className="flex items-center justify-between p-2 bg-gray-50 rounded group">
                                  <div className="flex items-center">
                                    <div className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-medium mr-2">
                                      {index + 1}
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">
                                      {anggota.nama}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <div className="flex items-center space-x-1">
                                      <button
                                        onClick={() => handleEditPosisi(anggota)}
                                        className="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-900 transition-opacity"
                                        title="Edit Posisi Juara"
                                      >
                                        <Trophy className="h-3 w-3" />
                                      </button>
                                      <PosisiDropdown id={anggota.id} posisi={anggota.posisi} />
                                      <button
                                        onClick={() => removeFromGroup(anggota.id)}
                                        className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-900 transition-opacity"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              
              {/* Unassigned Participants */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow p-4 sticky top-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                    <User className="h-5 w-5 text-gray-600 mr-2" />
                    Peserta Belum Tergrup
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {(() => {
                      const { unassigned } = getGroupedPeserta()
                      return unassigned.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          {groups.length === 0 ? 'Buat grup terlebih dahulu' : 'Semua peserta sudah tergrup'}
                        </div>
                      ) : (
                        unassigned.map((peserta) => (
                          <div key={peserta.id} className="p-2 bg-gray-50 rounded">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900">
                                {peserta.nama}
                              </span>
                              {peserta.posisi > 0 && (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getPosisiColor(peserta.posisi)}`}>
                                  <Trophy className="h-2 w-2 mr-1" />
                                  {peserta.posisi}
                                </span>
                              )}
                            </div>
                            <select
                              value={peserta.grup_id || ''}
                              onChange={(e) => e.target.value ? assignToGroup(peserta.id, e.target.value) : removeFromGroup(peserta.id)}
                              className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                            >
                              <option value="">Pilih Grup</option>
                              {groups.map((grup) => (
                                <option key={grup.id} value={grup.id}>
                                  {grup.nama}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))
                      )
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Group Form Modal */}
      {showGroupForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {editingGroupId ? 'Edit Nama Grup' : `Buat Grup Baru untuk ${lomba.find(l => l.id === selectedLomba)?.nama}`}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Grup
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Masukkan nama grup"
                  onKeyDown={(e) => e.key === 'Enter' && createNewGroup()}
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={createNewGroup}
                  disabled={!newGroupName.trim() || !selectedLomba}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {editingGroupId ? 'Update' : 'Buat Grup'}
                </button>
                <button
                  onClick={() => {
                    setShowGroupForm(false)
                    setNewGroupName('')
                    setEditingGroupId(null)
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default DataPeserta
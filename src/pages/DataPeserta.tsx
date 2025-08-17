import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Edit, Trash2, User, Trophy, Filter, Users, Shuffle } from 'lucide-react'
import { Database } from '../lib/supabase'

type Peserta = Database['public']['Tables']['peserta']['Row'] & {
  lomba?: { nama: string }
}
type Lomba = Database['public']['Tables']['lomba']['Row']
type Grup = Database['public']['Tables']['grup']['Row']

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
  const [showEditPosisiForm, setShowEditPosisiForm] = useState(false)
  const [editPosisi, setEditPosisi] = useState(0)
  const [formData, setFormData] = useState({
    nama: '',
    lomba_id: '',
    posisi: 0,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    // Fetch peserta with lomba name
    const { data: pesertaData } = await supabase
      .from('peserta')
      .select(`
        *,
        lomba:lomba_id (nama)
      `)
      .order('created_at', { ascending: false })

    // Fetch all lomba for dropdown
    const { data: lombaData } = await supabase
      .from('lomba')
      .select('*')
      .order('nama')

    if (pesertaData) setPeserta(pesertaData)
    if (lombaData) setLomba(lombaData)
    setLoading(false)
  }

  const fetchGroups = async () => {
    if (!selectedLomba) {
      setGroups([])
      return
    }
    
    setGroupsLoading(true)
    const { data } = await supabase
      .from('grup')
      .select('*')
      .eq('lomba_id', selectedLomba)
      .order('nama')
    
    if (data) setGroups(data)
    setGroupsLoading(false)
  }

  useEffect(() => {
    fetchGroups()
  }, [selectedLomba])

  const filteredPeserta = selectedLomba 
    ? peserta.filter(p => p.lomba_id === selectedLomba)
    : peserta

  const generateGroups = async () => {
    if (!selectedLomba) return
    
    const participants = [...filteredPeserta]
    let groupNumber = 1

    // Shuffle array untuk randomisasi
    for (let i = participants.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[participants[i], participants[j]] = [participants[j], participants[i]]
    }

    // Clear existing groups for this lomba
    await supabase.from('grup').delete().eq('lomba_id', selectedLomba)
    
    // Reset grup_id for all peserta in this lomba
    await supabase
      .from('peserta')
      .update({ grup_id: null })
      .eq('lomba_id', selectedLomba)

    // Create new groups and assign participants
    while (participants.length > 0) {
      const groupSize = participants.length === 1 ? 1 : 
                      participants.length <= grupSize ? participants.length :
                      Math.min(grupSize, participants.length)
      
      // Create group
      const { data: newGroup } = await supabase
        .from('grup')
        .insert({
          nama: `Grup ${groupNumber}`,
          lomba_id: selectedLomba
        })
        .select()
        .single()
      
      if (newGroup) {
        // Assign participants to group
        const anggota = participants.splice(0, groupSize)
        await supabase
          .from('peserta')
          .update({ grup_id: newGroup.id })
          .in('id', anggota.map(p => p.id))
      }
      
      groupNumber++
    }

    fetchGroups()
    fetchData()
  }

  const createNewGroup = async () => {
    if (!newGroupName.trim() || !selectedLomba) return
    
    if (editingGroupId) {
      await supabase
        .from('grup')
        .update({ nama: newGroupName })
        .eq('id', editingGroupId)
    } else {
      await supabase
        .from('grup')
        .insert({
          nama: newGroupName,
          lomba_id: selectedLomba
        })
    }
    
    setNewGroupName('')
    setEditingGroupId(null)
    setShowGroupForm(false)
    fetchGroups()
  }

  const handleEditGroup = (grup: Grup) => {
    setNewGroupName(grup.nama)
    setEditingGroupId(grup.id)
    setShowGroupForm(true)
  }

  const handleEditPosisi = (peserta: Peserta) => {
    setEditingPesertaId(peserta.id)
    setEditPosisi(peserta.posisi)
    setShowEditPosisiForm(true)
  }

  const updatePosisi = async () => {
    if (!editingPesertaId) return
    
    await supabase
      .from('peserta')
      .update({ posisi: editPosisi })
      .eq('id', editingPesertaId)
    
    setEditingPesertaId(null)
    setEditPosisi(0)
    setShowEditPosisiForm(false)
    fetchData()
  }

  const assignToGroup = async (pesertaId: string, grupId: string) => {
    await supabase
      .from('peserta')
      .update({ grup_id: grupId })
      .eq('id', pesertaId)
    
    fetchData()
  }

  const removeFromGroup = async (pesertaId: string) => {
    await supabase
      .from('peserta')
      .update({ grup_id: null })
      .eq('id', pesertaId)
    
    fetchData()
  }

  const deleteGroup = async (grupId: string) => {
    // Remove all assignments to this group
    await supabase
      .from('peserta')
      .update({ grup_id: null })
      .eq('grup_id', grupId)
    
    // Delete the group
    await supabase
      .from('grup')
      .delete()
      .eq('id', grupId)
    
    fetchGroups()
    fetchData()
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
    
    if (editingId) {
      await supabase
        .from('peserta')
        .update(formData)
        .eq('id', editingId)
    } else {
      await supabase
        .from('peserta')
        .insert([formData])
    }

    setFormData({ nama: '', lomba_id: '', posisi: 0 })
    setEditingId(null)
    setShowForm(false)
    fetchData()
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
    if (window.confirm('Yakin ingin menghapus peserta ini?')) {
      await supabase
        .from('peserta')
        .delete()
        .eq('id', id)
      fetchData()
    }
  }

  const resetForm = () => {
    setFormData({ nama: '', lomba_id: '', posisi: 0 })
    setEditingId(null)
    setShowForm(false)
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
      case 1: return 'bg-yellow-100 text-yellow-800'
      case 2: return 'bg-gray-100 text-gray-800'
      case 3: return 'bg-orange-100 text-orange-800'
      default: return 'bg-blue-100 text-blue-800'
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Peserta</h1>
          <p className="text-gray-600">Kelola data peserta lomba</p>
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
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Masukkan nama peserta"
                />
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
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div><span className="font-medium">Lomba:</span> {item.lomba?.nama || '-'}</div>
                        <div className="flex items-center">
                          <span className="font-medium mr-2">Status:</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPosisiColor(item.posisi)}`}>
                            {item.posisi > 0 && <Trophy className="h-3 w-3 mr-1" />}
                            {getPosisiText(item.posisi)}
                          </span>
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
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPosisiColor(item.posisi)}`}>
                              {item.posisi > 0 && <Trophy className="h-3 w-3 mr-1" />}
                              {getPosisiText(item.posisi)}
                            </span>
                          </td>
                          <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-900"
                            >
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
                                      {anggota.posisi > 0 && (
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPosisiColor(anggota.posisi)}`}>
                                          <Trophy className="h-3 w-3 mr-1" />
                                          {getPosisiText(anggota.posisi)}
                                        </span>
                                      )}
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
                              onChange={(e) => assignToGroup(peserta.id, e.target.value)}
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
                  onKeyPress={(e) => e.key === 'Enter' && createNewGroup()}
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

      {/* Edit Posisi Modal */}
      {showEditPosisiForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Edit Posisi Juara
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Posisi Juara
                </label>
                <select
                  value={editPosisi}
                  onChange={(e) => setEditPosisi(parseInt(e.target.value))}
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
                  onClick={updatePosisi}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Update
                </button>
                <button
                  onClick={() => {
                    setShowEditPosisiForm(false)
                    setEditingPesertaId(null)
                    setEditPosisi(0)
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
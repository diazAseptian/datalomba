import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { collection, onSnapshot, query, where, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { ArrowLeft, Trophy, Users, Calendar, MapPin, Shield } from 'lucide-react'

interface LombaDetail {
  id: string
  nama: string
  tanggal: string
  lokasi: string | null
}

interface JuaraItem {
  id: string
  nama: string
  posisi: number
  grup_id?: string
  grupNama?: string
}

const POSISI = {
  1: {
    text: 'Juara 1', icon: '🥇',
    cardBorder: 'border-yellow-300',
    cardBg: 'bg-gradient-to-r from-yellow-50 to-white',
    bar: 'from-yellow-400 to-yellow-500',
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    numBg: 'bg-yellow-400',
  },
  2: {
    text: 'Juara 2', icon: '🥈',
    cardBorder: 'border-gray-300',
    cardBg: 'bg-gradient-to-r from-gray-50 to-white',
    bar: 'from-gray-300 to-gray-400',
    badge: 'bg-gray-100 text-gray-700 border-gray-300',
    numBg: 'bg-gray-400',
  },
  3: {
    text: 'Juara 3', icon: '🥉',
    cardBorder: 'border-orange-300',
    cardBg: 'bg-gradient-to-r from-orange-50 to-white',
    bar: 'from-orange-300 to-orange-500',
    badge: 'bg-orange-100 text-orange-800 border-orange-300',
    numBg: 'bg-orange-400',
  },
} as const

const getLombaStatus = (tanggal: string) => {
  const todayStr = new Date().toISOString().slice(0, 10)
  const hariStr = new Date(tanggal).toISOString().slice(0, 10)
  if (todayStr < hariStr) return { label: 'Akan Datang', cls: 'bg-yellow-50 text-yellow-700 border border-yellow-300', dot: 'bg-yellow-400' }
  if (todayStr === hariStr) return { label: 'Berlangsung', cls: 'bg-green-50 text-green-700 border border-green-300', dot: 'bg-green-500 animate-pulse' }
  return { label: 'Selesai', cls: 'bg-white/20 text-white border border-white/40', dot: 'bg-white/70' }
}

const tahunSekarang = new Date().getFullYear()
const hutRI = tahunSekarang - 1945

const LombaDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [lomba, setLomba] = useState<LombaDetail | null>(null)
  const [grupMap, setGrupMap] = useState<Map<string, string>>(new Map())
  const [juara, setJuara] = useState<JuaraItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let latestGrupMap = new Map<string, string>()
    let latestJuaraRaw: any[] = []
    let loaded = { lomba: false, peserta: false, grup: false }

    const rebuild = () => {
      if (!loaded.peserta || !loaded.grup) return
      const result = latestJuaraRaw.map(d => ({
        id: d.id, nama: d.nama, posisi: d.posisi,
        grup_id: d.grup_id,
        grupNama: d.grup_id && latestGrupMap.has(d.grup_id) ? latestGrupMap.get(d.grup_id) : undefined,
      } as JuaraItem))
      setJuara(result)
      setLoading(false)
    }

    const unsubLomba = onSnapshot(doc(db, 'lomba', id), snap => {
      if (snap.exists()) setLomba({ id: snap.id, ...snap.data() } as LombaDetail)
      loaded.lomba = true
    })

    const unsubPeserta = onSnapshot(
      query(collection(db, 'peserta'), where('lomba_id', '==', id), where('posisi', '>', 0)),
      snap => {
        latestJuaraRaw = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        loaded.peserta = true
        rebuild()
      }
    )

    const unsubGrup = onSnapshot(
      query(collection(db, 'grup'), where('lomba_id', '==', id)),
      snap => {
        latestGrupMap = new Map(snap.docs.map(d => [d.id, (d.data() as any).nama]))
        setGrupMap(new Map(latestGrupMap))
        loaded.grup = true
        rebuild()
      }
    )

    return () => { unsubLomba(); unsubPeserta(); unsubGrup() }
  }, [id])

  // Kelompokkan per grup, urutkan nama grup, tanpa grup paling bawah
  const grouped = React.useMemo(() => {
    const map: Record<string, JuaraItem[]> = {}
    juara.forEach(j => {
      const key = j.grup_id || '__tanpa_grup__'
      if (!map[key]) map[key] = []
      map[key].push(j)
    })
    Object.values(map).forEach(arr => arr.sort((a, b) => a.posisi - b.posisi))
    return Object.entries(map).sort(([a], [b]) => {
      if (a === '__tanpa_grup__') return 1
      if (b === '__tanpa_grup__') return -1
      return (grupMap.get(a) || '').localeCompare(grupMap.get(b) || '')
    })
  }, [juara, grupMap])

  if (loading) return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 40%, #c2410c 100%)' }}>
      <div className="absolute inset-0 hero-pattern" />
      <div className="absolute top-0 left-0 w-64 h-64 opacity-20" style={{ background: 'radial-gradient(circle at 0% 0%, #f59e0b, transparent 70%)' }} />
      <div className="absolute bottom-0 right-0 w-48 h-48 opacity-10" style={{ background: 'radial-gradient(circle at 100% 100%, #f59e0b, transparent 70%)' }} />
      <div className="absolute top-0 left-0 right-0 h-1 flex">
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-yellow-400/60' : 'bg-white/20'}`} />
        ))}
      </div>
      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="flex flex-col w-12 h-8 rounded overflow-hidden shadow-lg border-2 border-white/40">
          <div className="flex-1 bg-red-800" />
          <div className="flex-1 bg-white" />
        </div>
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-white/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-yellow-400 animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-white/50 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
        </div>
        <div className="text-center">
          <p className="text-white font-extrabold text-base tracking-wide">Taruna Karya</p>
          <p className="text-white/60 text-xs mt-0.5">Memuat detail lomba...</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-px w-10 bg-yellow-400/50" />
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400/70" />
          <div className="h-px w-10 bg-yellow-400/50" />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 flex">
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-white/25' : 'bg-yellow-400/40'}`} />
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 40%, #c2410c 100%)' }}>
        {/* Pattern overlay */}
        <div className="absolute inset-0 hero-pattern" />
        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-black/10 rounded-full" />
        {/* Gold accent */}
        <div className="absolute top-0 left-0 w-40 h-40 opacity-20" style={{ background: 'radial-gradient(circle at 0% 0%, #f59e0b, transparent 70%)' }} />
        {/* Top ribbon */}
        <div className="absolute top-0 left-0 right-0 h-1 flex">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-yellow-400/60' : 'bg-white/20'}`} />
          ))}
        </div>

        {/* Admin button */}
        <Link
          to="/login"
          className="absolute top-4 right-4 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-sm text-white text-xs font-semibold rounded-full border border-white/25 hover:bg-white/25 transition-all"
        >
          <Shield className="h-3.5 w-3.5" /> Admin
        </Link>

        <div className="relative z-10 max-w-2xl mx-auto px-4 pt-6 pb-12">
          {/* Back button */}
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium mb-5 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>

          {/* Flag + title */}
          <div className="flex items-start gap-3 mb-3">
            <div className="flex flex-col w-9 h-6 rounded-sm overflow-hidden shadow-md border border-white/40 flex-shrink-0 mt-1">
              <div className="flex-1 bg-red-800" />
              <div className="flex-1 bg-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
              {lomba ? lomba.nama : '...'}
            </h1>
          </div>

          {/* Info pills */}
          {lomba && (
            <div className="flex flex-wrap gap-2 ml-0 sm:ml-12">
              {/* Status badge */}
              {(() => { const s = getLombaStatus(lomba.tanggal); return (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${s.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  {s.label}
                </span>
              )})()}
              {/* Tanggal */}
              <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full border border-white/20">
                <Calendar className="h-3 w-3" />
                {new Date(lomba.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              {/* Lokasi */}
              {lomba.lokasi && (
                <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full border border-white/20">
                  <MapPin className="h-3 w-3" />
                  {lomba.lokasi}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Bottom strip + wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="flex h-1">
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-white/30' : 'bg-red-900/60'}`} />
            ))}
          </div>
          <svg viewBox="0 0 1440 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 36 C240 0 480 24 720 12 C960 0 1200 24 1440 12 L1440 36 Z" fill="#f9fafb" />
          </svg>
        </div>
      </div>

      {/* KONTEN */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {juara.length === 0 ? (
          <div className="relative rounded-2xl overflow-hidden border border-yellow-100 bg-white">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500" />
            <div className="py-14 px-6 flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                <Trophy className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="font-extrabold text-gray-800 text-sm">Belum Ada Juara</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-xs">Data pemenang akan muncul setelah admin menentukan hasil lomba.</p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-px w-8 bg-yellow-300" />
                <span className="text-[10px] text-yellow-600 font-bold tracking-wide uppercase">Pantau terus</span>
                <div className="h-px w-8 bg-yellow-300" />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Section header */}
            <div className="flex items-center gap-3 px-1">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl shadow-sm" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                <Trophy className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="font-extrabold text-gray-900 text-base leading-tight">Daftar Juara</h2>
                <p className="text-xs text-gray-400">{juara.length} pemenang tercatat</p>
              </div>
            </div>

            {grouped.map(([grupId, anggota]) => {
              const namaGrup = grupId === '__tanpa_grup__' ? null : (grupMap.get(grupId) || grupId)
              return (
                <div key={grupId}>
                  {/* Grup label — hanya tampil jika ada nama grup */}
                  {namaGrup && (
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <Users className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                      <span className="font-bold text-gray-700 text-sm">{namaGrup}</span>
                      <span className="text-xs text-gray-400">· {anggota.length} pemenang</span>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {anggota.map(item => {
                      const p = POSISI[item.posisi as 1 | 2 | 3]
                      if (!p) return null
                      return (
                        <div
                          key={item.id}
                          className={`relative rounded-2xl border overflow-hidden shadow-sm ${p.cardBorder} ${p.cardBg}`}
                        >
                          {/* Top accent bar */}
                          <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${p.bar}`} />
                          <div className="flex items-center gap-3 px-4 py-3.5">
                            {/* Medal icon */}
                            <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl border ${p.cardBorder} bg-white shadow-sm`}>
                              {p.icon}
                            </div>
                            {/* Name */}
                            <div className="flex-1 min-w-0">
                              <p className="font-extrabold text-gray-900 text-sm leading-snug truncate">{item.nama}</p>
                              {namaGrup && <p className="text-xs text-gray-400 mt-0.5">{namaGrup}</p>}
                            </div>
                            {/* Badge */}
                            <span className={`flex-shrink-0 text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${p.badge}`}>
                              {p.text}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* Footer */}
        <div className="relative rounded-2xl overflow-hidden shadow-sm mt-2" style={{ background: 'linear-gradient(135deg, #991b1b 0%, #b91c1c 50%, #9a3412 100%)' }}>
          <div className="absolute inset-0 hero-pattern" />
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500" />
          <div className="absolute top-0 left-0 w-32 h-32 opacity-15" style={{ background: 'radial-gradient(circle at 0% 0%, #f59e0b, transparent 70%)' }} />
          <div className="relative z-10 p-5 text-center">
            <div className="flex justify-center mb-3">
              <div className="flex flex-col w-10 h-7 rounded overflow-hidden shadow border-2 border-white/60">
                <div className="flex-1 bg-red-800" />
                <div className="flex-1 bg-white" />
              </div>
            </div>
            <Link to="/" className="inline-flex items-center gap-1.5 text-white font-bold text-sm hover:text-yellow-200 transition-colors mb-2">
              <ArrowLeft className="h-4 w-4" /> Lihat semua lomba
            </Link>
            <p className="text-red-200 text-xs">HUT RI ke-{hutRI} · 17 Agustus {tahunSekarang} · © Taruna Karya Kampung Ciperang</p>
          </div>
          <div className="flex h-1">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-white/25' : 'bg-yellow-400/40'}`} />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

export default LombaDetail

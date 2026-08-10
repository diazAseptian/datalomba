import React, { useEffect, useState } from 'react'
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Link } from 'react-router-dom'
import { Trophy, Users, Calendar, Shield, MapPin, Flame, Clock, Info, Megaphone, ArrowRight, Search, X } from 'lucide-react'

interface LombaItem {
  id: string
  nama: string
  tanggal: string
  lokasi: string | null
  tampil?: boolean
  tahun?: number
}

interface Stats {
  totalLomba: number
  totalPeserta: number
  totalJuara: number
}

const QUOTES = [
  { text: 'Bersatu kita teguh, bercerai kita runtuh.', sumber: 'Pepatah Indonesia' },
  { text: 'Bangsa yang besar adalah bangsa yang menghormati jasa para pahlawannya.', sumber: 'Ir. Soekarno' },
  { text: 'Kemerdekaan hanyalah jembatan emas, di seberang jembatan itu ada jalan yang harus kita tempuh.', sumber: 'Ir. Soekarno' },
  { text: 'Jadilah generasi yang tidak hanya mewarisi kemerdekaan, tapi juga mengisinya.', sumber: 'Pesan Kemerdekaan' },
]

const CountUp: React.FC<{ target: number }> = ({ target }) => {
  const [val, setVal] = useState(0)
  useEffect(() => {
    setVal(0)
    if (target === 0) return
    let cur = 0
    const step = Math.ceil(target / 40)
    const t = setInterval(() => {
      cur += step
      if (cur >= target) { setVal(target); clearInterval(t) } else setVal(cur)
    }, 30)
    return () => clearInterval(t)
  }, [target])
  return <>{val}</>
}

const useCountdown = (tahun: number) => {
  const getTimeLeft = () => {
    const now = new Date()
    const target = new Date(`${tahun}-08-17T00:00:00`)
    const diff = Math.max(0, target.getTime() - now.getTime())
    return {
      sudah: diff === 0,
      hari: Math.floor(diff / (1000 * 60 * 60 * 24)),
      jam: Math.floor((diff / (1000 * 60 * 60)) % 24),
      menit: Math.floor((diff / (1000 * 60)) % 60),
      detik: Math.floor((diff / 1000) % 60),
    }
  }
  const [timeLeft, setTimeLeft] = useState(getTimeLeft())
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(getTimeLeft()), 1000)
    return () => clearInterval(t)
  }, [tahun])
  return timeLeft
}

const getLombaStatus = (tanggal: string) => {
  const today = new Date()
  const hari = new Date(tanggal)
  const todayStr = today.toISOString().slice(0, 10)
  const hariStr = hari.toISOString().slice(0, 10)
  if (todayStr < hariStr) return { label: 'Akan Datang', cls: 'bg-yellow-50 text-yellow-700 border border-yellow-300', dot: 'bg-yellow-400' }
  if (todayStr === hariStr) return { label: 'Berlangsung', cls: 'bg-green-50 text-green-700 border border-green-300', dot: 'bg-green-500 animate-pulse' }
  return { label: 'Selesai', cls: 'bg-gray-100 text-gray-500 border border-gray-200', dot: 'bg-gray-400' }
}

const LandingPage: React.FC = () => {
  const [stats, setStats] = useState<Stats>({ totalLomba: 0, totalPeserta: 0, totalJuara: 0 })
  const [lombaList, setLombaList] = useState<LombaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tahunAktif, setTahunAktif] = useState<number>(new Date().getFullYear())
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Semua' | 'Akan Datang' | 'Berlangsung' | 'Selesai'>('Semua')

  const hutRI = tahunAktif - 1945
  const countdown = useCountdown(tahunAktif)
  const quote = QUOTES[tahunAktif % QUOTES.length]

  useEffect(() => {
    // Dengarkan settings tahun aktif
    const unsubSettings = onSnapshot(doc(db, 'settings', 'landing'), snap => {
      if (snap.exists()) setTahunAktif(snap.data().tahunAktif ?? new Date().getFullYear())
    })
    return () => unsubSettings()
  }, [])

  useEffect(() => {
    let allLomba: LombaItem[] = []
    let allPeserta: any[] = []
    let loaded = { lomba: false, peserta: false }

    const rebuild = () => {
      if (!loaded.lomba || !loaded.peserta) return

      // Filter lomba: tahun aktif + tampil !== false
      const visibleLomba = allLomba.filter(l =>
        (l.tahun ?? new Date(l.tanggal).getFullYear()) === tahunAktif && l.tampil !== false
      )
      const visibleLombaIds = new Set(visibleLomba.map(l => l.id))

      // Statistik hanya dari lomba yang tampil
      const pesertaVisible = allPeserta.filter(p => visibleLombaIds.has(p.lomba_id))

      setLombaList(visibleLomba)
      setStats({
        totalLomba: visibleLomba.length,
        totalPeserta: pesertaVisible.length,
        totalJuara: pesertaVisible.filter(p => p.posisi > 0).length,
      })
      setLoading(false)
    }

    const unsubLomba = onSnapshot(query(collection(db, 'lomba'), orderBy('tanggal', 'asc')), snap => {
      allLomba = snap.docs.map(d => ({ id: d.id, ...d.data() } as LombaItem))
      loaded.lomba = true
      rebuild()
    })

    const unsubPeserta = onSnapshot(collection(db, 'peserta'), snap => {
      allPeserta = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      loaded.peserta = true
      rebuild()
    })

    return () => { unsubLomba(); unsubPeserta() }
  }, [tahunAktif])

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
        {/* Mini flag */}
        <div className="flex flex-col w-12 h-8 rounded overflow-hidden shadow-lg border-2 border-white/40">
          <div className="flex-1 bg-red-800" />
          <div className="flex-1 bg-white" />
        </div>
        {/* Spinner ring */}
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-white/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-yellow-400 animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-white/50 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
        </div>
        <div className="text-center">
          <p className="text-white font-extrabold text-base tracking-wide">Taruna Karya</p>
          <p className="text-white/60 text-xs mt-0.5">Memuat data lomba...</p>
        </div>
        {/* Gold divider */}
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

      {/* HERO */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 40%, #c2410c 100%)' }}>

        {/* Background pattern overlay */}
        <div className="absolute inset-0 hero-pattern" />

        {/* Decorative circles — background depth */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-black/10 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.03] rounded-full" />

        {/* Gold accent arc top-left */}
        <div className="absolute top-0 left-0 w-48 h-48 opacity-20" style={{ background: 'radial-gradient(circle at 0% 0%, #f59e0b, transparent 70%)' }} />

        {/* Floating decorative shapes */}
        <div className="absolute top-16 left-6 w-3 h-3 bg-yellow-400/40 rounded-full animate-float" />
        <div className="absolute top-32 right-10 w-2 h-2 bg-white/30 rounded-full animate-float-slow" />
        <div className="absolute bottom-20 left-12 w-2 h-2 bg-yellow-300/30 rounded-full animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-16 right-16 w-3 h-3 bg-white/20 rounded-full animate-float-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-24 left-1/4 w-1.5 h-1.5 bg-yellow-400/50 rounded-full animate-float" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-40 right-1/4 w-1.5 h-1.5 bg-white/40 rounded-full animate-float-slow" style={{ animationDelay: '1.5s' }} />

        {/* Diagonal ribbon accent — top */}
        <div className="absolute top-0 left-0 right-0 h-1 flex">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-yellow-400/60' : 'bg-white/20'}`} />
          ))}
        </div>

        {/* NAVBAR */}
        <nav className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-2 flex items-center justify-between">
          {/* Brand */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Kembali ke beranda"
            className="flex items-center gap-2.5 animate-fade-in"
          >
            {/* Mini flag */}
            <div className="flex flex-col w-8 h-5 rounded-sm overflow-hidden shadow-md border border-white/40 flex-shrink-0">
              <div className="flex-1 bg-red-800" />
              <div className="flex-1 bg-white" />
            </div>
            <div className="leading-tight">
              <p className="text-white font-extrabold text-sm tracking-wide">Taruna Karya</p>
              <p className="text-white/60 text-xs">Kampung Ciperang</p>
            </div>
          </button>

          {/* Admin link */}
          <Link
            to="/login"
            aria-label="Masuk ke halaman admin"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-sm text-white text-xs font-semibold rounded-full border border-white/25 hover:bg-white/25 transition-all animate-fade-in"
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Admin</span>
          </Link>
        </nav>

        {/* HERO CONTENT */}
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-14 sm:pt-10 sm:pb-20 text-center">

          {/* Badge */}
          <div
            className="hero-animate inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white text-xs font-bold px-4 py-1.5 rounded-full mb-5 border border-white/20 tracking-widest uppercase"
            style={{ animationDelay: '0s' }}
          >
            <Flame className="h-3.5 w-3.5 text-yellow-300" />
            🇮🇩 Semarak Kemerdekaan
          </div>

          {/* Main heading */}
          <h1
            className="hero-animate text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-4"
            style={{ animationDelay: '0.1s', textShadow: '0 2px 20px rgba(0,0,0,0.2)' }}
          >
            Rayakan Kemerdekaan
            <span className="block" style={{ color: '#fde68a' }}>Bersama Warga</span>
          </h1>

          {/* Subheading */}
          <p
            className="hero-animate text-red-100 text-base sm:text-lg leading-relaxed mb-2 max-w-xl mx-auto"
            style={{ animationDelay: '0.2s' }}
          >
            Satukan semangat, meriahkan kebersamaan, dan abadikan momen kemerdekaan bersama.
          </p>
          <p
            className="hero-animate text-white/50 text-xs sm:text-sm mb-8 px-2 break-words"
            style={{ animationDelay: '0.25s' }}
          >
            HUT RI ke-{hutRI} · 17 Agustus {tahunAktif} · Taruna Karya Kampung Ciperang
          </p>

          {/* CTA Buttons */}
          <div
            className="hero-animate flex flex-col sm:flex-row items-center justify-center gap-3 mb-10"
            style={{ animationDelay: '0.3s' }}
          >
            <button
              onClick={() => document.getElementById('daftar-lomba')?.scrollIntoView({ behavior: 'smooth' })}
              aria-label="Lihat daftar lomba"
              className="inline-flex items-center gap-2 bg-white text-red-600 font-bold text-sm px-7 py-3 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all w-full sm:w-auto justify-center"
            >
              <Calendar className="h-4 w-4" />
              Lihat Lomba
            </button>

          </div>

          {/* COUNTDOWN embedded in hero */}
          <div
            className="hero-animate max-w-sm mx-auto"
            style={{ animationDelay: '0.45s' }}
          >
            {countdown.sudah ? (
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/20">
                <p className="text-white font-extrabold text-lg">🎉 Selamat HUT RI ke-{hutRI}!</p>
                <p className="text-red-200 text-sm mt-1">Dirgahayu Republik Indonesia 🇮🇩</p>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-4 border border-white/15">
                <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-3 flex items-center justify-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-yellow-300" />
                  Menuju Hari Kemerdekaan
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { val: countdown.hari, label: 'Hari' },
                    { val: countdown.jam, label: 'Jam' },
                    { val: countdown.menit, label: 'Menit' },
                    { val: countdown.detik, label: 'Detik' },
                  ].map(({ val, label }) => (
                    <div key={label} className="text-center">
                      <div
                        className="countdown-digit bg-white/20 rounded-xl py-2.5 px-1 mb-1 border border-white/20"
                        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                      >
                        <span className="text-2xl sm:text-3xl font-extrabold text-white leading-none">
                          {String(val).padStart(2, '0')}
                        </span>
                      </div>
                      <span className="text-white/60 text-xs font-medium">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          {/* Merah-putih strip */}
          <div className="flex h-1.5">
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-white/30' : 'bg-red-900/60'}`} />
            ))}
          </div>
          {/* White wave shape */}
          <svg
            viewBox="0 0 1440 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full block"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0 48 C240 0 480 32 720 16 C960 0 1200 32 1440 16 L1440 48 Z"
              fill="#f9fafb"
            />
          </svg>
        </div>
      </section>

      {/* STATS */}
      <div className="max-w-2xl mx-auto px-4 -mt-7 relative z-10">
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: 'Jenis Lomba', value: stats.totalLomba, icon: Calendar,
              iconBg: 'bg-red-600', numColor: 'text-red-600',
              border: 'border-red-100', accent: 'from-red-500 to-red-600',
            },
            {
              label: 'Total Peserta', value: stats.totalPeserta, icon: Users,
              iconBg: 'bg-red-700', numColor: 'text-red-700',
              border: 'border-red-100', accent: 'from-red-600 to-red-800',
            },
            {
              label: 'Total Juara', value: stats.totalJuara, icon: Trophy,
              iconBg: 'bg-yellow-500', numColor: 'text-yellow-600',
              border: 'border-yellow-100', accent: 'from-yellow-400 to-yellow-500',
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`group relative bg-white rounded-2xl shadow-md border ${s.border} overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`}
            >
              {/* top accent bar */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${s.accent}`} />
              <div className="pt-3 pb-3 px-1.5 flex flex-col items-center text-center">
                <div className={`inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 ${s.iconBg} rounded-xl mb-2 shadow-sm group-hover:scale-105 transition-transform`}>
                  <s.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                </div>
                <div className={`text-xl sm:text-2xl font-extrabold leading-none ${s.numColor}`}>
                  {loading ? <span className="text-gray-200">–</span> : <CountUp target={s.value} />}
                </div>
                <div className="text-[10px] sm:text-[11px] text-gray-500 mt-1 font-semibold leading-tight">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div id="konten" className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* DAFTAR LOMBA */}
        <div id="daftar-lomba">
          {/* Section header */}
          <div className="flex items-center gap-3 mb-4 px-1">
            <div className="flex items-center justify-center w-8 h-8 bg-red-600 rounded-xl shadow-sm">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-gray-900 text-base leading-tight">Daftar Lomba {tahunAktif}</h2>
              <p className="text-xs text-gray-400">Klik kartu untuk lihat detail & hasil</p>
            </div>
          </div>

          {!loading && lombaList.length > 0 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {(['Semua', 'Akan Datang', 'Berlangsung', 'Selesai'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    filterStatus === s
                      ? 'bg-red-600 text-white border-red-600 shadow-sm'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-red-300 hover:text-red-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {!loading && lombaList.length > 0 && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari lomba..."
                className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Hapus pencarian"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {lombaList.length === 0 ? (
            <div className="relative rounded-2xl overflow-hidden border border-red-100 bg-white">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500" />
              <div className="py-12 px-6 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg, #b91c1c, #dc2626)' }}>
                  <Calendar className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="font-extrabold text-gray-800 text-sm">Belum Ada Lomba</p>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-xs">Panitia belum menambahkan lomba untuk tahun {tahunAktif}. Pantau terus ya! 🎉</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-px w-8 bg-red-200" />
                  <span className="text-[10px] text-red-400 font-bold tracking-wide uppercase">HUT RI ke-{hutRI}</span>
                  <div className="h-px w-8 bg-red-200" />
                </div>
              </div>
            </div>
          ) : (() => {
            const filtered = lombaList.filter(l => {
              const matchSearch = l.nama.toLowerCase().includes(search.toLowerCase().trim())
              const matchStatus = filterStatus === 'Semua' || getLombaStatus(l.tanggal).label === filterStatus
              return matchSearch && matchStatus
            })
            if (filtered.length === 0) return (
              <div className="relative rounded-2xl overflow-hidden border border-gray-100 bg-white">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200" />
                <div className="py-12 px-6 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-extrabold text-gray-700 text-sm">Belum ada lomba yang ditemukan.</p>
                    <p className="text-xs text-gray-400 mt-1">Coba kata kunci atau filter lain</p>
                  </div>
                </div>
              </div>
            )
            return (
              <div className="space-y-3">
                {filtered.map((lomba, i) => (
                  <div
                    key={lomba.id}
                    className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500" />
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-red-700" />
                    <div className="pl-5 pr-4 py-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold text-white shadow-md group-hover:scale-105 transition-transform"
                          style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-extrabold text-gray-900 text-sm leading-snug group-hover:text-red-600 transition-colors">
                              {lomba.nama}
                            </p>
                            {(() => { const s = getLombaStatus(lomba.tanggal); return (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap flex-shrink-0 ${s.cls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                {s.label}
                              </span>
                            )})()}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="h-3 w-3 text-red-400" />
                              {new Date(lomba.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                            {lomba.lokasi && (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                <MapPin className="h-3 w-3 text-red-400" />
                                {lomba.lokasi}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Link
                          to={`/lomba/${lomba.id}`}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-sm hover:shadow-md hover:brightness-110 active:scale-95 transition-all"
                          style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
                        >
                          Lihat Detail
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>

        {/* QUOTE */}
        <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 55%, #c2410c 100%)' }}>
          <div className="absolute inset-0 hero-pattern" />
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500" />
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-500" />
          <div className="absolute top-0 left-0 w-36 h-36 opacity-20" style={{ background: 'radial-gradient(circle at 0% 0%, #f59e0b, transparent 70%)' }} />
          <div className="absolute bottom-0 right-0 w-28 h-28 opacity-10" style={{ background: 'radial-gradient(circle at 100% 100%, #f59e0b, transparent 70%)' }} />
          <div className="relative z-10 px-4 sm:px-6 py-7 text-center">
            <div className="text-5xl leading-none text-yellow-400/60 font-serif select-none mb-3">“</div>
            <p className="text-white text-sm sm:text-base font-semibold leading-relaxed italic max-w-sm mx-auto" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.2)' }}>
              {quote.text}
            </p>
            <div className="text-5xl leading-none text-yellow-400/60 font-serif select-none mt-3 rotate-180 inline-block">“</div>
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="h-px w-8 bg-yellow-400/50" />
              <span className="text-yellow-200 text-xs font-bold tracking-wide">{quote.sumber}</span>
              <div className="h-px w-8 bg-yellow-400/50" />
            </div>
          </div>
        </div>

        {/* INFO KEMERDEKAAN */}
        <div id="info-kemerdekaan">
          <div className="flex items-center gap-3 mb-4 px-1">
            <div className="flex items-center justify-center w-8 h-8 bg-red-600 rounded-xl shadow-sm">
              <Info className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-gray-900 text-base leading-tight">Tentang Kegiatan Ini</h2>
              <p className="text-xs text-gray-400">Semangat kemerdekaan dalam setiap langkah</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { emoji: '🇮🇩', judul: 'Hari Kemerdekaan', isi: `17 Agustus 1945 — Proklamasi Kemerdekaan RI dibacakan Soekarno-Hatta. Tahun ${tahunAktif} kita rayakan HUT RI ke-${hutRI}.`, accent: 'border-red-200', bar: 'from-red-500 to-red-600' },
              { emoji: '🏅', judul: 'Tradisi Lomba 17-an', isi: 'Lomba 17-an adalah tradisi tahunan yang mempererat persatuan, kebersamaan, dan semangat warga kampung.', accent: 'border-yellow-200', bar: 'from-yellow-400 to-yellow-500' },
              { emoji: '🤝', judul: 'Gotong Royong', isi: 'Diselenggarakan oleh Taruna Karya Kampung Ciperang sebagai wujud nyata semangat gotong royong dan kebersamaan.', accent: 'border-red-200', bar: 'from-red-500 to-red-600' },
              { emoji: '📊', judul: 'Transparan & Real-time', isi: 'Hasil lomba dapat dipantau langsung oleh seluruh warga secara terbuka, jujur, dan transparan.', accent: 'border-yellow-200', bar: 'from-yellow-400 to-yellow-500' },
              { emoji: '🎯', judul: 'Tujuan Kegiatan', isi: 'Memupuk sportivitas, kreativitas, dan kebersamaan antar warga dalam semangat peringatan kemerdekaan.', accent: 'border-red-200', bar: 'from-red-500 to-red-600' },
              { emoji: '📅', judul: 'Diselenggarakan Setiap Tahun', isi: `Kegiatan ini rutin diadakan setiap tahun menjelang dan pada tanggal 17 Agustus di Kampung Ciperang.`, accent: 'border-yellow-200', bar: 'from-yellow-400 to-yellow-500' },
            ].map(({ emoji, judul, isi, accent, bar }) => (
              <div
                key={judul}
                className={`group relative bg-white rounded-2xl border ${accent} shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
              >
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${bar}`} />
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="text-2xl leading-none">{emoji}</div>
                    <p className="font-extrabold text-gray-900 text-sm leading-snug">{judul}</p>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed">{isi}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PENGUMUMAN / AJAKAN */}
        <div id="ajakan" className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 55%, #c2410c 100%)' }}>
          <div className="absolute inset-0 hero-pattern" />
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500" />
          <div className="absolute top-0 left-0 w-40 h-40 opacity-20" style={{ background: 'radial-gradient(circle at 0% 0%, #f59e0b, transparent 70%)' }} />
          <div className="absolute bottom-0 right-0 w-32 h-32 opacity-10" style={{ background: 'radial-gradient(circle at 100% 100%, #ffffff, transparent 70%)' }} />
          {/* Floating dots */}
          <div className="absolute top-4 right-8 w-2 h-2 bg-yellow-400/40 rounded-full" />
          <div className="absolute top-8 right-16 w-1.5 h-1.5 bg-white/30 rounded-full" />
          <div className="absolute bottom-6 left-10 w-2 h-2 bg-white/20 rounded-full" />

          <div className="relative z-10 px-6 py-8 text-center">
            <div className="inline-flex items-center gap-1.5 bg-yellow-400/20 border border-yellow-400/40 text-yellow-200 text-[10px] font-extrabold px-3 py-1 rounded-full tracking-widest uppercase mb-3">
              <Megaphone className="h-3 w-3" />
              Ayo Ikut Serta!
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight mb-2" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
              Ikut Berpartisipasi
            </h2>
            <p className="text-red-100 text-sm leading-relaxed max-w-xs mx-auto mb-6">
              Daftarkan diri kamu ke panitia Taruna Karya Kampung Ciperang untuk ikut serta dalam lomba {tahunAktif}. Bersama kita rayakan kemerdekaan! 🎉
            </p>
            <button
              onClick={() => document.getElementById('daftar-lomba')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 bg-white text-red-600 font-extrabold text-sm px-6 py-2.5 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              <Calendar className="h-4 w-4" />
              Lihat Daftar Lomba
            </button>
          </div>

          <div className="flex h-1">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-white/25' : 'bg-yellow-400/40'}`} />
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #991b1b 0%, #b91c1c 50%, #9a3412 100%)' }}>
          <div className="absolute inset-0 hero-pattern" />
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500" />
          <div className="absolute top-0 left-0 w-40 h-40 opacity-15" style={{ background: 'radial-gradient(circle at 0% 0%, #f59e0b, transparent 70%)' }} />

          <div className="relative z-10 px-5 pt-6 pb-4">
            {/* Branding */}
            <div className="flex items-center gap-2.5 mb-2">
              <div className="flex flex-col w-8 h-5 rounded-sm overflow-hidden shadow border border-white/40 flex-shrink-0">
                <div className="flex-1 bg-red-800" />
                <div className="flex-1 bg-white" />
              </div>
              <div>
                <p className="text-white font-extrabold text-sm leading-tight">Taruna Karya</p>
                <p className="text-red-300 text-[10px]">Kampung Ciperang</p>
              </div>
            </div>
            <p className="text-red-200 text-xs leading-relaxed mb-5">
              Platform resmi pencatatan & publikasi hasil lomba HUT RI ke-{hutRI} · {tahunAktif}.
            </p>

            {/* Nav links */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-5">
              {[
                { label: 'Beranda', anchor: '' },
                { label: 'Daftar Lomba', anchor: 'daftar-lomba' },
                { label: 'Informasi', anchor: 'info-kemerdekaan' },
                { label: 'Ikut Partisipasi', anchor: 'ajakan' },
              ].map(({ label, anchor }) => (
                <button
                  key={label}
                  onClick={() => anchor ? document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' }) : window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="text-left text-red-200 hover:text-yellow-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span className="w-1 h-1 rounded-full bg-yellow-400/60 flex-shrink-0" />
                  {label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="flex h-px mb-4">
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-white/15' : 'bg-yellow-400/30'}`} />
              ))}
            </div>

            {/* Copyright */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-red-300 text-[10px]">
                🇮🇩 Dirgahayu RI ke-{hutRI} · 17 Agustus {tahunAktif}
              </p>
              <p className="text-red-400 text-[10px]">
                © {tahunAktif} Taruna Karya Kampung Ciperang
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default LandingPage

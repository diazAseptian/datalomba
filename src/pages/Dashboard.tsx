import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Trophy, Users, Calendar, Award } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface Stats {
  totalLomba: number
  totalPeserta: number
  totalJuara1: number
  totalJuara2: number
  totalJuara3: number
  belumJuara: number
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalLomba: 0,
    totalPeserta: 0,
    totalJuara1: 0,
    totalJuara2: 0,
    totalJuara3: 0,
    belumJuara: 0,
  })
  const [chartData, setChartData] = useState<any[]>([])
  const [pieData, setPieData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Get total competitions
      const { count: lombaCount } = await supabase
        .from('lomba')
        .select('*', { count: 'exact', head: true })

      // Get total participants
      const { count: pesertaCount } = await supabase
        .from('peserta')
        .select('*', { count: 'exact', head: true })

      // Get winners by position
      const { count: juara1Count } = await supabase
        .from('peserta')
        .select('*', { count: 'exact', head: true })
        .eq('posisi', 1)

      const { count: juara2Count } = await supabase
        .from('peserta')
        .select('*', { count: 'exact', head: true })
        .eq('posisi', 2)

      const { count: juara3Count } = await supabase
        .from('peserta')
        .select('*', { count: 'exact', head: true })
        .eq('posisi', 3)

      const { count: belumJuaraCount } = await supabase
        .from('peserta')
        .select('*', { count: 'exact', head: true })
        .eq('posisi', 0)

      const newStats = {
        totalLomba: lombaCount || 0,
        totalPeserta: pesertaCount || 0,
        totalJuara1: juara1Count || 0,
        totalJuara2: juara2Count || 0,
        totalJuara3: juara3Count || 0,
        belumJuara: belumJuaraCount || 0,
      }

      setStats(newStats)

      // Prepare bar chart data
      setChartData([
        { name: 'Juara 1', value: newStats.totalJuara1, fill: '#FFD700' },
        { name: 'Juara 2', value: newStats.totalJuara2, fill: '#C0C0C0' },
        { name: 'Juara 3', value: newStats.totalJuara3, fill: '#CD7F32' },
        { name: 'Belum Juara', value: newStats.belumJuara, fill: '#94A3B8' },
      ])

      // Prepare pie chart data
      setPieData([
        { name: 'Juara 1', value: newStats.totalJuara1, fill: '#FFD700' },
        { name: 'Juara 2', value: newStats.totalJuara2, fill: '#C0C0C0' },
        { name: 'Juara 3', value: newStats.totalJuara3, fill: '#CD7F32' },
        { name: 'Belum Juara', value: newStats.belumJuara, fill: '#94A3B8' },
      ])

      setLoading(false)
    } catch (error) {
      console.error('Error fetching stats:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  const cards = [
    {
      name: 'Total Lomba',
      value: stats.totalLomba,
      icon: Calendar,
      color: 'bg-blue-500',
    },
    {
      name: 'Total Peserta',
      value: stats.totalPeserta,
      icon: Users,
      color: 'bg-green-500',
    },
    {
      name: 'Juara 1',
      value: stats.totalJuara1,
      icon: Trophy,
      color: 'bg-yellow-500',
    },
    {
      name: 'Juara 2',
      value: stats.totalJuara2,
      icon: Award,
      color: 'bg-gray-400',
    },
    {
      name: 'Juara 3',
      value: stats.totalJuara3,
      icon: Award,
      color: 'bg-orange-600',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Statistik Lomba 17 Agustus Taruna Karya</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon
          return (
            <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`inline-flex items-center justify-center p-3 ${card.color} rounded-md shadow-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {card.name}
                      </dt>
                      <dd className="text-3xl font-bold text-gray-900">
                        {card.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bar Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Distribusi Posisi Peserta
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Persentase Juara
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
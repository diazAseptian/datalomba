import React, { createContext, useContext, useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

const TAHUN_AWAL = 2025
const tahunNow = new Date().getFullYear()
export const PILIHAN_TAHUN = Array.from({ length: tahunNow - TAHUN_AWAL + 3 }, (_, i) => TAHUN_AWAL + i)

interface TahunContextType {
  tahunAktif: number
  setTahunAktif: (t: number) => Promise<void>
  loading: boolean
}

const TahunContext = createContext<TahunContextType>({} as TahunContextType)

export const useTahun = () => useContext(TahunContext)

export const TahunProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tahunAktif, setTahunState] = useState<number>(tahunNow)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'landing'), snap => {
      if (snap.exists()) setTahunState(snap.data().tahunAktif ?? tahunNow)
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [])

  const setTahunAktif = async (t: number) => {
    await setDoc(doc(db, 'settings', 'landing'), { tahunAktif: t }, { merge: true })
  }

  return (
    <TahunContext.Provider value={{ tahunAktif, setTahunAktif, loading }}>
      {children}
    </TahunContext.Provider>
  )
}

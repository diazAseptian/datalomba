import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: 'data-lomba-17agustus.firebasestorage.app',
  messagingSenderId: '653016217191',
  appId: '1:653016217191:web:6d5d62f2e4d35797bbc6c2',
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)

export type Lomba = {
  id: string
  nama: string
  tanggal: string
  lokasi: string | null
  created_at: string
  tampil: boolean
}

export type Peserta = {
  id: string
  nama: string
  lomba_id: string
  posisi: number
  grup_id: string | null
  created_at: string
  lomba?: { nama: string }
  grup?: { nama: string }
}

export type Grup = {
  id: string
  nama: string
  lomba_id: string
  created_at: string
}

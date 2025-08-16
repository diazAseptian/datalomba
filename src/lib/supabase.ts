import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qjiikxlobicwtsgqeuqc.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaWlreGxvYmljd3RzZ3FldXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNTY5NjcsImV4cCI6MjA3MDkzMjk2N30.5g2sTjs24Nkl-VwIA5a3zCe1l3gfdUuh9MDpnHPfsok'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      lomba: {
        Row: {
          id: string
          nama: string
          tanggal: string
          lokasi: string | null
          created_at: string
        }
        Insert: {
          id?: string
          nama: string
          tanggal: string
          lokasi?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          nama?: string
          tanggal?: string
          lokasi?: string | null
          created_at?: string
        }
      }
      peserta: {
        Row: {
          id: string
          nama: string
          lomba_id: string
          posisi: number
          grup_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          nama: string
          lomba_id: string
          posisi?: number
          grup_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          nama?: string
          lomba_id?: string
          posisi?: number
          grup_id?: string | null
          created_at?: string
        }
      }
      grup: {
        Row: {
          id: string
          nama: string
          lomba_id: string
          created_at: string
        }
        Insert: {
          id?: string
          nama: string
          lomba_id: string
          created_at?: string
        }
        Update: {
          id?: string
          nama?: string
          lomba_id?: string
          created_at?: string
        }
      }
    }
  }
}
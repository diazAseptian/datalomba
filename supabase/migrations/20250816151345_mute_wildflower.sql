/*
  # Create competition management schema

  1. New Tables
    - `lomba` (competitions)
      - `id` (uuid, primary key)
      - `nama` (text, competition name)
      - `tanggal` (date, competition date)
      - `lokasi` (text, location)
    - `peserta` (participants)
      - `id` (uuid, primary key)
      - `nama` (text, participant name)
      - `lomba_id` (uuid, foreign key to lomba)
      - `posisi` (integer, position: 0=not winner, 1=1st, 2=2nd, 3=3rd)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage data
*/

CREATE TABLE IF NOT EXISTS lomba (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  tanggal date NOT NULL,
  lokasi text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS peserta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  lomba_id uuid REFERENCES lomba(id) ON DELETE CASCADE,
  posisi int CHECK (posisi BETWEEN 0 AND 3) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lomba ENABLE ROW LEVEL SECURITY;
ALTER TABLE peserta ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users to manage all data
CREATE POLICY "Authenticated users can manage lomba data"
  ON lomba
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage peserta data"
  ON peserta
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert sample data
INSERT INTO lomba (nama, tanggal, lokasi) VALUES 
  ('Balap Karung', '2024-08-17', 'Lapangan Kampung'),
  ('Tarik Tambang', '2024-08-17', 'Lapangan Kampung'),
  ('Lomba Makan Kerupuk', '2024-08-17', 'Panggung Utama'),
  ('Panjat Pinang', '2024-08-17', 'Area Pinang'),
  ('Balap Sepeda Hias', '2024-08-17', 'Jalan Kampung');

INSERT INTO peserta (nama, lomba_id, posisi) 
SELECT 
  'Peserta ' || generate_series(1, 20),
  (SELECT id FROM lomba ORDER BY random() LIMIT 1),
  floor(random() * 4)::int;
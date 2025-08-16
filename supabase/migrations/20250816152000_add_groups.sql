/*
  # Add groups table for competition grouping

  1. New Table
    - `grup` (groups)
      - `id` (uuid, primary key)
      - `nama` (text, group name)
      - `lomba_id` (uuid, foreign key to lomba)
      - `created_at` (timestamptz)

  2. Update peserta table
    - Add `grup_id` (uuid, foreign key to grup)

  3. Security
    - Enable RLS on grup table
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS grup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  lomba_id uuid REFERENCES lomba(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Add grup_id to peserta table
ALTER TABLE peserta ADD COLUMN IF NOT EXISTS grup_id uuid REFERENCES grup(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE grup ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can manage grup data"
  ON grup
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
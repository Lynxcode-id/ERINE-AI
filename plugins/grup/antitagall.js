import { makeGuardToggle } from '../../lib/guardToggle.js'
import * as db from '../../database/dbantitagall.js'

export default makeGuardToggle({
  command: 'antitagall',
  alias: ['antitagsemua', 'antiall'],
  title: 'Anti Tag All',
  desc: 'Member yang men-tag semua anggota grup diberi peringatan SEKALI. Kalau mengulang, langsung dikeluarkan.',
  db
})

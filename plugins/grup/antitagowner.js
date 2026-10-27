import { makeGuardToggle } from '../../lib/guardToggle.js'
import * as db from '../../database/dbantitagowner.js'

export default makeGuardToggle({
  command: 'antitagowner',
  alias: ['antitagown', 'antimentionowner'],
  title: 'Anti Tag Owner',
  desc: 'Member yang men-tag owner bot diberi peringatan SEKALI. Kalau mengulang, langsung dikeluarkan.',
  db
})

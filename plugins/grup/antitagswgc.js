import { makeGuardToggle } from '../../lib/guardToggle.js'
import * as db from '../../database/dbantitagswgc.js'

export default makeGuardToggle({
  command: 'antitagswgc',
  alias: ['antiswgc', 'antistatusgc'],
  title: 'Anti Status Grup',
  desc: 'Member yang mengirim status grup (group status) di grup ini langsung dikeluarkan.',
  db
})

import { makeGuardToggle } from '../../lib/guardToggle.js'
import * as db from '../../database/dbantitagsw.js'

export default makeGuardToggle({
  command: 'antitagsw',
  alias: ['antitagstatus', 'antimentionsw'],
  title: 'Anti Tag Status',
  desc: 'Member yang men-tag/mention grup ini di status WhatsApp-nya langsung dikeluarkan.',
  db
})

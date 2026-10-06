import { watchFile, unwatchFile } from 'fs'
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import moment from 'moment-timezone'

let wibh = moment.tz('Asia/Makassar').format('HH')
let wibm = moment.tz('Asia/Makassar').format('mm')
let wibs = moment.tz('Asia/Makassar').format('ss')
let wktuwib = `${wibh} H ${wibm} M ${wibs} S`
let wktugeneral = `${wibh}:${wibm}:${wibs}`

let d = new Date(new Date + 3600000)
let locale = 'id'
let weton = ['Pahing', 'Pon', 'Wage', 'Kliwon', 'Legi'][Math.floor(d / 84600000) % 5]
let week = d.toLocaleDateString(locale, { weekday: 'long' })
let date = d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
})
const more = String.fromCharCode(8206)
const readMore = more.repeat(4001)

global.owner = [['6288258041396', 'ʟʏɴx ᴅᴇᴄᴏᴅᴇ', true]]
global.mods = []
global.prems = []
global.nomorbot = '6288242223382'
global.pairingNumber = '6288242223382'
global.nomorown = '6288258041396'
global.nameown = 'ʟʏɴx ᴅᴇᴄᴏᴅᴇ'
global.version = '1.0.0'
global.autotyping = false
global.autorecording = false

global.readMore = readMore
global.author = 'ҽɾιɳҽ ρɾσʝҽƈƚ'
global.namebot = 'ҽɾιɳҽ αі'
global.wm = 'ҽɾιɳҽ-ᥲі x ʅყɳx ɱαɳυҽʅȥ'
global.watermark = wm
global.botdate = `❈ DATE: ${week} ${date}\n❀ 𝗧𝗶𝗺𝗲: ${wktuwib}`
global.bottime = `T I M E : ${wktuwib}`
global.stickpack = `ᴇʀɪɴᴇ ᴘʀᴏᴊᴇᴄᴛ\nPowered by ${namebot}\nwa.me/${nomorbot}`
global.stickauth = `ƈ : ҽɾʝɳҽ ρɾσʝҽƈƚ`
global.week = `${week} ${date}`
global.wibb = `${wktuwib}`

global.sig = 'https://www.instagram.com/lynnnx_35fps'
global.sgh = '-'
global.sgc = 'https://chat.whatsapp.com/D0i9bk7QHc67iLd3HZGNJs'
global.sgw = '_'
global.sdc = '-'
global.sfb = ''
global.snh = ''

global.egg = "15"
global.nestid = "5"
global.loc = "1"
global.domain = "-"
global.apikey = "-"
global.capikey = "-"

global.qris = 'https://c.termai.cc/i119/hZR1g.jpg'
global.psaweria = 'https://saweria.co/LynxPreset'

global.welcomeBg = 'https://c.termai.cc/i136/U9UWxB.jpg'
global.goodbyeBg = 'https://c.termai.cc/i166/lWwS.jpg'
global.menuThumb = 'https://c.termai.cc/i177/YPu.jpg'
global.videothumb = 'https://c.termai.cc/v188/CHBtAz.mp4'
global.menuAudio = [
    'https://c.termai.cc/a137/QAn0.mp3',
    'https://files.catbox.moe/0kcx57.mp3',
    'https://files.catbox.moe/ek9cli.mp3',
    'https://files.catbox.moe/8rwp6j.mp3',
    'https://files.catbox.moe/pgdu4c.mp3',
    'https://files.catbox.moe/hc9hrb.mp3',
    'https://files.catbox.moe/2ut7m8.mp3',
    'https://files.catbox.moe/oxzh73.mp3',
    'https://files.catbox.moe/mjpkdf.mp3',
    'https://files.catbox.moe/9tq80c.mp3',
    'https://files.catbox.moe/1cw079.mp3',
    'https://files.catbox.moe/2ptm0q.mp3',
    'https://files.catbox.moe/ubb9ge.mp3',
    'https://files.catbox.moe/hc9hrb.mp3'
]

global.menuaudio = [
'https://c.termai.cc/a131/2TZYlSS.mp3'
]

global.chId = '120363400612665352@newsletter'
global.newsletterName = '「 🐣 ᴇʀɪɴᴇ-ᴍᴅ ɪɴғᴏʀᴍᴀᴛɪᴏɴ 」'
global.wait = '🫵🏻😋 ᴛᴜɴɢɢᴜ ʙᴇɴᴛᴀʀ ᴇʀɪɴᴇ ᴍᴀᴋᴀɴ...'
global.eror = '🐣 ʏᴀʜ ᴇʀʀᴏʀ ɴɪʜ ᴜʟᴀɴɢ ʟᴀɢɪ ɴᴀɴᴛɪ ʏᴀ!'

global.rpg = {
	emoticon(string) {
		string = string.toLowerCase()
		let emot = {
			level: '🧬',
			limit: '🌌',
			health: '❤️',
			exp: '✉️',
			money: '💵',
			potion: '🥤',
			diamond: '💎',
			common: '📦',
			uncommon: '🎁',
			mythic: '🗳️',
			legendary: '🗃️',
			pet: '🎁',
			trash: '🗑',
			armor: '🥼',
			sword: '⚔️',
			pickaxe: '⛏️',
			fishingrod: '🎣',
			bow: '🏹',
			wood: '🪵',
			rock: '🪨',
			string: '🕸️',
			horse: '🐎',
			cat: '🐈',
			dog: '🐕',
			fox: '🦊',
			wolf: '🐺',
			centaur: '🐎',
			phoenix: '🦜',
			dragon: '🐉',
			petfood: '🍖',
			iron: '⛓️',
			gold: '👑',
			emerald: '💚',
			bibitmangga: '🌾',
			bibitanggur: '🌾',
			bibitjeruk: '🌾',
			bibitpisang: '🌾',
			bibitapel: '🌾',
			mangga: '🥭',
			anggur: '🍇',
			jeruk: '🍊',
			pisang: '🍌',
			apel: '🍎',
			ayam: '🐔',
			kambing: '🐐',
			sapi: '🐄',
			kerbau: '🐃',
			babi: '🐖',
			harimau: '🐅',
			banteng: '🐂',
			monyet: '🐒',
			babihutan: '🐗',
			panda: '🐼',
			gajah: '🐘',
			buaya: '🐊',
			orca: '🐋',
			paus: '🐳',
			lumba: '🐬',
			hiu: '🦈',
			ikan: '🐟',
			lele: '🐟',
			bawal: '🐡',
			nila: '🐠',
			kepiting: '🦀',
			lobster: '🦞',
			gurita: '🐙',
			cumi: '🦑',
			udang: '🦐',
			steak: '🍝',
			sate: '🍢',
			rendang: '🍜',
			kornet: '🥣',
			nugget: '🍱',
			bluefin: '🍲',
			seafood: '🍛',
			sushi: '🍣',
			moluska: '🥘',
			squidprawm: '🍤',
			rumahsakit: '🏥',
			restoran: '🏭',
			pabrik: '🏯',
			tambang: '⚒️',
			pelabuhan: '🛳️'
		}
		let results = Object.keys(emot).map(v => [v, new RegExp(v, 'gi')]).filter(v => v[1].test(string))
		if (!results.length) return ''
		else return emot[results[0][0]]
	}
}

let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
    unwatchFile(file)
    console.log(chalk.redBright("Update 'config.js'"))
    import(`${file}?update=${Date.now()}`)
})

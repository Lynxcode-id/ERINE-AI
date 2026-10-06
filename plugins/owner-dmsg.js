import { delay } from '@whiskeysockets/baileys';

async function dmsg(conn, chatId, stanzaId) {
const tempId = await conn.relayMessage(
		chatId,
		{
			groupStatusMessageV2: {
				message: {
					extendedTextMessage: {
						text: '',
						contextInfo: {
							isGroupStatus: true
						}
					}
				}
			}
		},
		{}
	);

	const tempId2 = await conn.relayMessage(
		chatId,
		{
			protocolMessage: {
				key: {
					jid: chatId,
					fromMe: true,
					id: tempId
				},
				type: 14,
				editedMessage: {
					extendedTextMessage: {
						text: '\0',
						contextInfo: {
							isGroupStatus: false
						}
					}
				}
			}
		},
		{
			messageId: stanzaId
		}
	);

	await delay(100);

	await Promise.allSettled([
		conn.sendMessage(chatId, {
			delete: {
				remoteJid: chatId,
				id: tempId,
				fromMe: true
			}
		}),
		conn.sendMessage(chatId, {
			delete: {
				remoteJid: chatId,
				id: tempId2,
				fromMe: true
			}
		})
	]);
}

const handler = async (m, { conn }) => {
	if (!m.quoted) {
		return m.reply('Reply pesan yang ingin diproses.');
	}

	if (!m.isGroup) {
		return m.reply('Command ini hanya bisa digunakan di grup.');
	}

	try {
		await dmsg(conn, m.chat, m.quoted.id)
	} catch (e) {
		console.error('[dmsg]', e);
		await m.reply('Error: ' + (e?.message || e));
	}
};

handler.help = ['dmsg'];
handler.tags = ['owner'];
handler.command = /^dmsg$/i;
handler.owner = true;
handler.group = true;

export default handler;

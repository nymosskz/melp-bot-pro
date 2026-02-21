export default {
    command: ['addowner'],
    isOwner: true,
    run: async (sock, m, { args, db, chat, senderNum, botNum }) => {
        let target;

        if (m.message.extendedTextMessage?.contextInfo?.participant) {
            target = m.message.extendedTextMessage.contextInfo.participant.split('@')[0];
        } else if (m.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            target = m.message.extendedTextMessage.contextInfo.mentionedJid[0].split('@')[0];
        } else if (args[0]) {
            target = args[0].replace(/[^0-9]/g, '');
        }

        if (!target) {
            return sock.sendMessage(chat, { text: '❌ Etiqueta a alguien, responde a su mensaje o escribe su número.' });
        }

        db.prepare("INSERT OR IGNORE INTO users (id) VALUES (?)").run(target);
        db.prepare("UPDATE users SET permiso = 'owner' WHERE id = ?").run(target);

        await sock.sendMessage(chat, { 
            text: `👑 @${target} ha sido ascendido a Owner de Melp Bot Pro.`, 
            mentions: [target + '@s.whatsapp.net'] 
        }, { quoted: m });
    }
}


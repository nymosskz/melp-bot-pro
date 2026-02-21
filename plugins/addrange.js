export default {
    command: ['addowner', 'addpremium'],
    isOwner: true,
    run: async (sock, m, { args, db, chat, command }) => {
        let target;
        const rango = command === 'addowner' ? 'owner' : 'premium';
        const label = command === 'addowner' ? 'Owner' : 'Premium';

        if (m.message.extendedTextMessage?.contextInfo?.participant) {
            target = m.message.extendedTextMessage.contextInfo.participant.split('@')[0];
        } else if (m.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            target = m.message.extendedTextMessage.contextInfo.mentionedJid[0].split('@')[0];
        } else if (args[0]) {
            target = args[0].replace(/[^0-9]/g, '');
        }

        if (!target) {
            return sock.sendMessage(chat, { text: `❌ Etiqueta, responde o escribe el número para dar ${label}.` });
        }

        db.prepare("INSERT OR IGNORE INTO users (id) VALUES (?)").run(target);
        db.prepare("UPDATE users SET permiso = ? WHERE id = ?").run(rango, target);

        await sock.sendMessage(chat, { 
            text: `✨ @${target} ahora tiene rango *${label}* en Melp Bot Pro.`, 
            mentions: [target + '@s.whatsapp.net'] 
        }, { quoted: m });
    }
}

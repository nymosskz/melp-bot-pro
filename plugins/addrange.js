export default {
    command: ['addowner', 'addpremium', 'delpermiso'],
    isOwner: true,
    run: async (sock, m, { args, db, chat, command }) => {
        let target;
        let rango;
        let mensaje;

        if (command === 'addowner') {
            rango = 'owner';
            mensaje = 'ascendido a *Owner*';
        } else if (command === 'addpremium') {
            rango = 'premium';
            mensaje = 'asignado como *Premium*';
        } else {
            rango = 'user';
            mensaje = 'removido de sus rangos (ahora es *User*)';
        }

        if (m.message.extendedTextMessage?.contextInfo?.participant) {
            target = m.message.extendedTextMessage.contextInfo.participant.split('@')[0];
        } else if (m.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            target = m.message.extendedTextMessage.contextInfo.mentionedJid[0].split('@')[0];
        } else if (args[0]) {
            target = args[0].replace(/[^0-9]/g, '');
        }

        if (!target) {
            return sock.sendMessage(chat, { text: '❌ Etiqueta, responde o escribe el número para gestionar el rango.' });
        }

        db.prepare("INSERT OR IGNORE INTO users (id) VALUES (?)").run(target);
        db.prepare("UPDATE users SET permiso = ? WHERE id = ?").run(rango, target);

        await sock.sendMessage(chat, { 
            text: `✨ @${target} ha sido ${mensaje} en Melp Bot Pro.`, 
            mentions: [target + '@s.whatsapp.net'] 
        }, { quoted: m });
    }
}

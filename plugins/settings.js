export default {
    command: ['setbrand', 'setmoneda', 'setname', 'settings'],
    isOwner: true,
    run: async (sock, m, { args, db, chat, command }) => {
        let config = db.prepare("SELECT * FROM settings WHERE id = 1").get();
        
        if (command === 'settings' || !args[0]) {
            return sock.sendMessage(chat, { 
                text: `⚙️ *CONFIGURACIÓN GLOBAL*\n\n` +
                      `🤖 *Nombre Bot:* ${config.name}\n` +
                      `🏷️ *Marca:* ${config.brand}\n` +
                      `🪙 *Moneda:* ${config.moneda}\n\n` +
                      `*Vista Previa:*\n` +
                      `🏦 ${config.brand} Bank\n` +
                      `🛣️ ${config.brand} Street\n` +
                      `ℹ️ Info ${config.name}`
            });
        }

        const valor = args.join(' ');

        if (command === 'setbrand') {
            db.prepare("UPDATE settings SET brand = ? WHERE id = 1").run(valor);
            await sock.sendMessage(chat, { text: `✅ Marca: *${valor}*\n(Ej: ${valor} Street, ${valor} Bank)` });
        } 

        else if (command === 'setmoneda') {
            db.prepare("UPDATE settings SET moneda = ? WHERE id = 1").run(valor);
            await sock.sendMessage(chat, { text: `✅ Moneda: *${valor}*` });
        }

        else if (command === 'setname') {
            db.prepare("UPDATE settings SET name = ? WHERE id = 1").run(valor);
            await sock.sendMessage(chat, { text: `✅ Nombre del Bot: *${valor}*` });
        }
    }
}


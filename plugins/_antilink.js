export default {
    command: ['antilink'],
    isOwner: true,
    run: async (sock, m, { args, db, chat, isGroup }) => {
        if (!isGroup) return sock.sendMessage(chat, { text: '❌ Este comando solo funciona en grupos.' })

        const mode = args[0]?.toLowerCase()
        let group = db.prepare("SELECT * FROM groups WHERE id = ?").get(chat)
        if (!group) {
            db.prepare("INSERT INTO groups (id) VALUES (?)").run(chat)
            group = { id: chat, antilink: 0, antilinkall: 0 }
        }

        if (!mode) {
            const estado = group.antilinkall === 1 ? 'ALL (Cualquier Link)' : (group.antilink === 1 ? 'WhatsApp Links' : 'OFF')
            return sock.sendMessage(chat, { 
                text: `⚙️ *CONFIGURACIÓN DE SEGURIDAD*\n\n` +
                      `1️⃣ *.antilink on*: Solo links de WhatsApp.\n` +
                      `2️⃣ *.antilink all*: Cualquier link (HTTP/HTTPS).\n` +
                      `3️⃣ *.antilink off*: Desactivar protección.\n\n` +
                      `Estado actual: *${estado}*` 
            })
        }

        if (mode === 'on') {
            db.prepare("UPDATE groups SET antilink = 1, antilinkall = 0 WHERE id = ?").run(chat)
            await sock.sendMessage(chat, { text: '✅ *Nivel 1 Activado:* Ahora borraré links de WhatsApp y expulsaré al intruso.' })
        } else if (mode === 'all') {
            db.prepare("UPDATE groups SET antilink = 0, antilinkall = 1 WHERE id = ?").run(chat)
            await sock.sendMessage(chat, { text: '🚫 *Nivel 2 Activado:* Filtro total activo. Cualquier link resultará en expulsión.' })
        } else if (mode === 'off') {
            db.prepare("UPDATE groups SET antilink = 0, antilinkall = 0 WHERE id = ?").run(chat)
            await sock.sendMessage(chat, { text: '❌ Seguridad desactivada. Ya no borraré enlaces.' })
        } else {
            await sock.sendMessage(chat, { text: '❓ Opción no válida. Usa: on, all u off.' })
        }
    }
}


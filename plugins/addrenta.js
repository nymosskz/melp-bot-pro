export default {
    command: ['rentar', 'addrenta', 'mirenta'],
    run: async (sock, m, { args, db, isOwner, chat, senderNum, user }) => {
        const command = m.message.conversation || m.message.extendedTextMessage?.text || ""
        const isMirenta = command.includes('mirenta') || command.includes('perfil')

        if (isMirenta) {
            if (user.renta_fin === 0) return sock.sendMessage(chat, { text: '❌ No tienes una renta activa.' })
            
            const restante = user.renta_fin - Date.now()
            if (restante <= 0) return sock.sendMessage(chat, { text: '❌ Tu renta ya ha vencido.' })

            const d = Math.floor(restante / (1000 * 60 * 60 * 24))
            const h = Math.floor((restante % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const min = Math.floor((restante % (1000 * 60 * 60)) / (1000 * 60))

            const texto = `📊 *ESTADO DE RENTA*\n\n` +
                          `👤 Usuario: @${senderNum}\n` +
                          `⏳ Tiempo restante: ${d}d ${h}h ${min}m\n` +
                          `🪙 MelpCoins: ${user.coins}\n` +
                          `✨ Nivel: ${user.permiso}`

            return sock.sendMessage(chat, { text: texto, mentions: [senderNum + '@s.whatsapp.net'] }, { quoted: m })
        }

        if (!isOwner) return sock.sendMessage(chat, { text: '🚫 Solo Owners pueden usar este comando.' })

        let target
        if (m.message.extendedTextMessage?.contextInfo?.participant) {
            target = m.message.extendedTextMessage.contextInfo.participant.split('@')[0]
        } else if (m.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            target = m.message.extendedTextMessage.contextInfo.mentionedJid[0].split('@')[0]
        } else if (args[0] && !/[a-z]/i.test(args[0])) {
            target = args[0].replace(/[^0-9]/g, '')
        }

        if (!target) return sock.sendMessage(chat, { text: '❌ Indica un usuario (cita, mención o número).' })

        const tiempoArg = args.find(a => /[0-9][smhd]/i.test(a)) || args[1]
        if (!tiempoArg) return sock.sendMessage(chat, { text: '❌ Indica el tiempo. Ej: .rentar @user 30d' })

        const unidad = tiempoArg.slice(-1).toLowerCase()
        const valor = parseInt(tiempoArg)
        if (isNaN(valor)) return sock.sendMessage(chat, { text: '❌ Formato de tiempo inválido.' })

        let ms = 0
        if (unidad === 's') ms = valor * 1000
        else if (unidad === 'm') ms = valor * 60 * 1000
        else if (unidad === 'h') ms = valor * 60 * 60 * 1000
        else if (unidad === 'd') ms = valor * 24 * 60 * 60 * 1000
        else ms = valor * 24 * 60 * 60 * 1000

        let u = db.prepare("SELECT renta_fin FROM users WHERE id = ?").get(target)
        if (!u) {
            db.prepare("INSERT INTO users (id) VALUES (?)").run(target)
            u = { renta_fin: 0 }
        }

        const base = u.renta_fin > Date.now() ? u.renta_fin : Date.now()
        const nuevaFecha = base + ms

        db.prepare("UPDATE users SET renta_fin = ?, aviso = 0 WHERE id = ?").run(nuevaFecha, target)

        const fechaObj = new Date(nuevaFecha)
        const fString = fechaObj.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })

        await sock.sendMessage(chat, { 
            text: `✅ Renta actualizada para @${target}\n⏳ Expira: ${fString}`, 
            mentions: [target + '@s.whatsapp.net'] 
        }, { quoted: m })
    }
                                                       }


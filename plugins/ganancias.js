const delays = {
    work: 90000, 
    slut: 240000, 
    crime: 240000, 
    rob: 240000
}

const lastUsed = new Map()

export default {
    command: ['work', 'w', 'slut', 'crime', 'rob', 'robar'],
    run: async (sock, m, { db, chat, command, senderNum, settings, isOwner, user }) => {
        if (!isOwner && user.registrado === 0) {
            return sock.sendMessage(chat, { text: `❌ No estás registrado en ${settings.brand}.\nUsa: *.reg Nombre.Edad*` })
        }

        const userId = senderNum
        const ahora = Date.now()
        const moneda = settings.moneda || 'MelpBot'
        const brand = settings.brand || 'Melp'
        
        const cmd = ['w'].includes(command) ? 'work' : (['robar'].includes(command) ? 'rob' : command)

        if (!lastUsed.has(userId)) lastUsed.set(userId, {})
        const userDelays = lastUsed.get(userId)
        
        if (userDelays[cmd] && ahora - userDelays[cmd] < delays[cmd]) {
            const faltante = delays[cmd] - (ahora - userDelays[cmd])
            const segundos = Math.ceil(faltante / 1000)
            return sock.sendMessage(chat, { text: `⏳ *${brand} Street* | Espera *${segundos}s* para usar *${cmd}*.` })
        }

        let mensaje = ''
        let ganancia = 0

        if (cmd === 'work') {
            ganancia = Math.floor(Math.random() * 4000) + 1000
            const trabajos = [
                `👷 Ayudaste en construcción de ${brand} Tower y ganaste *${ganancia} ${moneda}*`,
                `🧹 Limpiaste servidores de ${brand} Tech y encontraste *${ganancia} ${moneda}*`,
                `👨‍💻 Programaste un script para ${brand} Corp y te pagaron *${ganancia} ${moneda}*`,
                `📦 Repartiste paquetes y sacaste *${ganancia} ${moneda}* en propinas`,
                `🍔 Trabajaste en comida rápida de ${brand} y ganaste *${ganancia} ${moneda}*`,
                `⛽ Despachaste gasolina en la estación ${brand} y ganaste *${ganancia} ${moneda}*`,
                `🏢 Limpiaste cristales de rascacielos y ganaste *${ganancia} ${moneda}*`,
                `📞 Soporte técnico en ${brand}, te depositaron *${ganancia} ${moneda}*`,
                `🎸 Tocaste guitarra en el metro de ${brand} y recibiste *${ganancia} ${moneda}*`,
                `🐕 Paseaste perros de un millonario en ${brand} y ganaste *${ganancia} ${moneda}*`,
                `🌮 Vendiste tacos en la esquina de ${brand} Street y ganaste *${ganancia} ${moneda}*`,
                `🎮 Streamaste 5 horas en ${brand} Live y te donaron *${ganancia} ${moneda}*`,
                `🍺 Serviste cervezas en ${brand} Bar, propinas: *${ganancia} ${moneda}*`,
                `🚚 Hiciste una mudanza pesada y te dieron *${ganancia} ${moneda}*`,
                `💇 Cortaste pelo en la barbería ${brand} y ganaste *${ganancia} ${moneda}*`
            ]
            mensaje = trabajos[Math.floor(Math.random() * trabajos.length)]
        }
        
        else if (cmd === 'slut') {
            ganancia = Math.floor(Math.random() * 3000) + 2000
            const slutTxt = [
                `🫦 Un empresario en el hotel ${brand} te dejó *${ganancia} ${moneda}*`,
                `💋 Bailaste en el tubo de ${brand} Club y te lanzaron *${ganancia} ${moneda}*`,
                `👠 Cita rápida en un callejón de ${brand}, cobraste *${ganancia} ${moneda}*`,
                `👯 Show privado por webcam en ${brand} Fans, ganaste *${ganancia} ${moneda}*`,
                `👗 "Acompañaste" a un político a una cena en ${brand} y recibiste *${ganancia} ${moneda}*`,
                `🖤 Un Sugar Daddy de ${brand} te envió *${ganancia} ${moneda}*`,
                `💅 Fingiste ser novia en una fiesta de ${brand} y te pagaron *${ganancia} ${moneda}*`,
                `🧴 Masaje con final feliz en ${brand} Spa, propina de *${ganancia} ${moneda}*`,
                `🍾 Un borracho en el antro ${brand} te dio *${ganancia} ${moneda}*`,
                `🎭 Actuaste en video casero de ${brand} Studio y te pagaron *${ganancia} ${moneda}*`
            ]
            mensaje = slutTxt[Math.floor(Math.random() * slutTxt.length)]
        }
        
        else if (cmd === 'crime') {
            ganancia = Math.floor(Math.random() * 5000) + 1500
            if (Math.random() < 0.45) {
                ganancia = -Math.floor(ganancia * 0.4)
                const failCrime = [
                    `👮 ¡La policía de ${brand} te esperaba! Multa de *${Math.abs(ganancia)} ${moneda}*`,
                    `🚑 El asalto salió mal, el hospital te costó *${Math.abs(ganancia)} ${moneda}*`,
                    `🤡 Te hackearon mientras hackeabas, perdiste *${Math.abs(ganancia)} ${moneda}*`,
                    `🚔 Saltó la alarma del ${brand} Bank, fianza: *${Math.abs(ganancia)} ${moneda}*`,
                    `🐕 Un perro guardián te mordió, vacunas: *${Math.abs(ganancia)} ${moneda}*`
                ]
                mensaje = failCrime[Math.floor(Math.random() * failCrime.length)]
            } else {
                const crimeTxt = [
                    `🔫 Camión de valores de ${brand}, te llevaste *${ganancia} ${moneda}*`,
                    `🏦 Cajero del ${brand} Bank hackeado, escupió *${ganancia} ${moneda}*`,
                    `👜 Bolso de una anciana en ${brand} Street, tenía *${ganancia} ${moneda}*`,
                    `💎 Joyería ${brand} asaltada, ganancia: *${ganancia} ${moneda}*`,
                    `🏪 OXXO de ${brand} asaltado, caja con *${ganancia} ${moneda}*`,
                    `💻 Estafa nigeriana exitosa desde ${brand}, *${ganancia} ${moneda}*`,
                    `📦 Paquete de Amazon robado en ${brand}, valía *${ganancia} ${moneda}*`,
                    `💳 Tarjetas clonadas en el centro de ${brand}, ganaste *${ganancia} ${moneda}*`
                ]
                mensaje = crimeTxt[Math.floor(Math.random() * crimeTxt.length)]
            }
        }
        
        else if (cmd === 'rob') {
            const mentioned = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
            if (!mentioned || mentioned.split('@')[0] === senderNum) return sock.sendMessage(chat, { text: `👥 *Menciona a alguien:* @usuario` })
            
            const targetId = mentioned.split('@')[0]
            const victima = db.prepare("SELECT * FROM users WHERE id = ?").get(targetId)
            
            if (!victima || victima.coins < 1000) return sock.sendMessage(chat, { text: `🤏 Está en la quiebra, no vale la pena robarle.` })
            
            if (Math.random() > 0.6) {
                const porcentaje = (Math.random() * (0.10 - 0.07) + 0.07)
                ganancia = Math.floor(victima.coins * porcentaje)
                db.prepare("UPDATE users SET coins = coins - ? WHERE id = ?").run(ganancia, targetId)
                mensaje = `🏃‍♂️💨 Le quitaste *${ganancia} ${moneda}* (*${(porcentaje * 100).toFixed(1)}%*) a @${targetId}`
            } else {
                ganancia = -(Math.floor(Math.random() * 1000) + 500)
                mensaje = `🚔 Te atrapó la policía de ${brand}, multa de *${Math.abs(ganancia)} ${moneda}*`
            }
        }

        userDelays[cmd] = ahora
        db.prepare("UPDATE users SET coins = coins + ?, xp = xp + 20 WHERE id = ?").run(ganancia, userId)
        
        await sock.sendMessage(chat, { 
            text: mensaje, 
            mentions: [m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || ''] 
        }, { quoted: m })
    }
}

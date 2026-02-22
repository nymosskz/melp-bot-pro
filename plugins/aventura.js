const delays = {
    explore: 300000,
    mine: 600000,
    gamble: 30000,
    heal: 120000,
    beg: 60000
}

const lastUsed = new Map()

export default {
    command: ['explore', 'mine', 'gamble', 'apostar', 'heal', 'curar', 'beg', 'mendigar'],
    run: async (sock, m, { db, chat, command, senderNum, settings, args, user, isOwner }) => {
        if (!isOwner && user.registrado === 0) {
            return sock.sendMessage(chat, { text: `❌ Regístrate en ${settings.brand} para usar este comando.\nUsa: *.reg Nombre.Edad*` })
        }

        const ahora = Date.now()
        const moneda = settings.moneda || 'MelpBot'
        const brand = settings.brand || 'Melp'
        const cmd = command === 'apostar' ? 'gamble' : (command === 'curar' ? 'heal' : (command === 'mendigar' ? 'beg' : command))

        if (!lastUsed.has(senderNum)) lastUsed.set(senderNum, {})
        const userDelays = lastUsed.get(senderNum)
        
        if (userDelays[cmd] && ahora - userDelays[cmd] < delays[cmd]) {
            const faltante = Math.ceil((delays[cmd] - (ahora - userDelays[cmd])) / 1000)
            return sock.sendMessage(chat, { text: `⏳ *${brand} Street* | Descansa *${faltante}s* para volver a usar ${command}.` })
        }

        let mensaje = ''
        let ganancia = 0
        let saludUpdate = user.hp

        switch (cmd) {
            case 'explore':
                ganancia = Math.floor(Math.random() * 1200) + 300
                const sitios = [
                    `Exploraste las alcantarillas de ${brand} y hallaste`,
                    `Encontraste un cargamento en el puerto de ${brand} con`,
                    `Un turista en ${brand} Square te dio una propina de`,
                    `Saqueaste un contenedor industrial en ${brand} y sacaste`
                ]
                mensaje = `🗺️ ${sitios[Math.floor(Math.random() * sitios.length)]} *${ganancia} ${moneda}*.`
                break

            case 'mine':
                ganancia = Math.floor(Math.random() * 2500) + 800
                mensaje = `⛏️ *${brand} Mining:* Minaste datos encriptados y obtuviste *${ganancia} ${moneda}*.`
                break

            case 'beg':
                ganancia = Math.floor(Math.random() * 200) + 50
                mensaje = `🦴 *${brand} Beg:* Pediste limosna en el centro de ${brand} y conseguiste *${ganancia} ${moneda}*.`
                break

            case 'heal':
                const costoFull = 2000
                if (user.hp >= 100) return sock.sendMessage(chat, { text: `❤️ Ya tienes salud máxima (100 HP).` })
                if (user.coins < costoFull) return sock.sendMessage(chat, { text: `❌ Necesitas *${costoFull} ${moneda}* para una recuperación total.` })
                ganancia = -costoFull
                saludUpdate = 100
                mensaje = `💉 *${brand} Medical:* Hospitalización completa exitosa. ¡Tu HP está al 100%! Pagaste *${costoFull} ${moneda}*.`
                break

            case 'gamble':
                const apuesta = parseInt(args[0])
                if (isNaN(apuesta) || apuesta < 100) return sock.sendMessage(chat, { text: `🎰 Uso: .apostar [cantidad]` })
                if (user.coins < apuesta) return sock.sendMessage(chat, { text: `❌ Saldo insuficiente.` })
                
                if (Math.random() > 0.55) {
                    ganancia = apuesta
                    mensaje = `🎲 *${brand} Casino:* ¡Felicidades! Ganaste *${apuesta} ${moneda}*.`
                } else {
                    ganancia = -apuesta
                    mensaje = `📉 *${brand} Casino:* Mala suerte, perdiste *${apuesta} ${moneda}*.`
                }
                break
        }

        userDelays[cmd] = ahora
        db.prepare("UPDATE users SET coins = coins + ?, xp = xp + 15, hp = ? WHERE id = ?").run(ganancia, saludUpdate, senderNum)
        await sock.sendMessage(chat, { text: mensaje }, { quoted: m })
    }
}

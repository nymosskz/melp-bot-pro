const delays = {
    explore: 300000, // 5 min
    mine: 600000,    // 10 min
    gamble: 30000,   // 30 seg
    heal: 120000,    // 2 min
    beg: 60000       // 1 min
}

const lastUsed = new Map()

export default {
    command: ['explore', 'mine', 'gamble', 'apostar', 'heal', 'curar', 'beg', 'mendigar'],
    run: async (sock, m, { db, chat, command, senderNum, settings, args }) => {
        // 1. Verificación de Registro interna
        let user = db.prepare("SELECT * FROM users WHERE id = ?").get(senderNum)
        
        // Parche por si no existe la columna (evita errores)
        try {
            if (!user || user.registrado !== 1) {
                return sock.sendMessage(chat, { 
                    text: `❌ *¡ALTO!* No estás registrado en ${settings.brand}.\nUsa *.reg [nombre]* para empezar.` 
                })
            }
        } catch (e) {
            // Si la columna no existe, el bot intentará crearla (auto-fix)
            db.prepare(`ALTER TABLE users ADD COLUMN registrado INTEGER DEFAULT 0`).run()
            db.prepare(`ALTER TABLE users ADD COLUMN name TEXT DEFAULT 'User'`).run()
            return sock.sendMessage(chat, { text: `⚠️ Sistema actualizado. Por favor, usa *.reg [nombre]* de nuevo.` })
        }

        const ahora = Date.now()
        const moneda = settings.moneda || 'MelpBot'
        const brand = settings.brand || 'Melp'
        const cmd = command === 'apostar' ? 'gamble' : (command === 'curar' ? 'heal' : (command === 'mendigar' ? 'beg' : command))

        // 2. Gestión de Delays
        if (!lastUsed.has(senderNum)) lastUsed.set(senderNum, {})
        const userDelays = lastUsed.get(senderNum)
        
        if (userDelays[cmd] && ahora - userDelays[cmd] < delays[cmd]) {
            const faltante = Math.ceil((delays[cmd] - (ahora - userDelays[cmd])) / 1000)
            return sock.sendMessage(chat, { text: `⏳ *${brand} Street* | Descansa *${faltante}s* para volver a usar ${command}.` })
        }

        let mensaje = ''
        let ganancia = 0
        const luck = Math.random()

        switch (cmd) {
            case 'explore':
                ganancia = Math.floor(Math.random() * 1200) + 300
                const sitios = [
                    `Exploraste las alcantarillas de ${brand} y hallaste una bolsa con`,
                    `Encontraste un cargamento abandonado en el puerto de ${brand} con`,
                    `Un turista perdido en ${brand} Square te dio una propina de`,
                    `Saqueaste un contenedor en la zona industrial de ${brand} y sacaste`
                ]
                mensaje = `🗺️ ${sitios[Math.floor(Math.random() * sitios.length)]} *${ganancia} ${moneda}*.`
                break

            case 'mine':
                ganancia = Math.floor(Math.random() * 2500) + 800
                mensaje = `⛏️ *${brand} Mining:* Minaste datos encriptados de la red de ${brand} y obtuviste *${ganancia} ${moneda}*.`
                break

            case 'beg':
                ganancia = Math.floor(Math.random() * 200) + 50
                mensaje = `🦴 *${brand} Beg:* Pediste limosna frente al ${brand} Bank y conseguiste *${ganancia} ${moneda}*.`
                break

            case 'heal':
                const costo = 500
                if (user.coins < costo) return sock.sendMessage(chat, { text: `❌ No tienes ${costo} ${moneda} para pagar el hospital.` })
                ganancia = -costo
                mensaje = `💉 *${brand} Medical:* Te has curado de tus heridas. Pagaste *${costo} ${moneda}*.`
                break

            case 'gamble':
                const apuesta = parseInt(args[0])
                if (isNaN(apuesta) || apuesta < 100) return sock.sendMessage(chat, { text: `🎰 Uso: .apostar [mínimo 100]` })
                if (user.coins < apuesta) return sock.sendMessage(chat, { text: `❌ No tienes suficiente saldo.` })
                
                if (luck > 0.55) {
                    ganancia = apuesta
                    mensaje = `🎲 *${brand} Casino:* ¡Felicidades! Ganaste *${apuesta} ${moneda}*.`
                } else {
                    ganancia = -apuesta
                    mensaje = `📉 *${brand} Casino:* Mala suerte, perdiste *${apuesta} ${moneda}*.`
                }
                break
        }

        userDelays[cmd] = ahora
        db.prepare("UPDATE users SET coins = coins + ?, xp = xp + 15 WHERE id = ?").run(ganancia, senderNum)
        await sock.sendMessage(chat, { text: mensaje }, { quoted: m })
    }
            }
            

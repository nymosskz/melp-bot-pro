export default {
    command: ['reg', 'registrar'],
    run: async (sock, m, { args, db, chat, senderNum, settings }) => {
        const input = args.join(' ')
        const brand = settings.brand || 'Melp'
        const moneda = settings.moneda || 'MelpBot'

        try {
            db.prepare("SELECT registrado, name, age FROM users LIMIT 1").get()
        } catch (e) {
            db.prepare(`ALTER TABLE users ADD COLUMN registrado INTEGER DEFAULT 0`).run()
            db.prepare(`ALTER TABLE users ADD COLUMN name TEXT DEFAULT 'Sin Nombre'`).run()
            db.prepare(`ALTER TABLE users ADD COLUMN age INTEGER DEFAULT 0`).run()
        }

        if (!input || !input.includes('.')) {
            return sock.sendMessage(chat, { 
                text: `📝 *REGISTRO DE CIUDADANO*\n\nUso: .reg [Nombre].[Edad]\nEjemplo: *.reg nymos.17*` 
            })
        }

        const [nombre, edad] = input.split('.')
        const edadNum = parseInt(edad)

        if (!nombre || isNaN(edadNum)) {
            return sock.sendMessage(chat, { text: `⚠️ Formato incorrecto. Usa: *Nombre.Edad*` })
        }

        if (nombre.length > 15) {
            return sock.sendMessage(chat, { text: `❌ Nombre demasiado largo (máx 15 letras).` })
        }

        if (edadNum < 5 || edadNum > 90) {
            return sock.sendMessage(chat, { text: `❌ Edad no válida.` })
        }

        let user = db.prepare("SELECT * FROM users WHERE id = ?").get(senderNum)
        if (user && user.registrado === 1) {
            return sock.sendMessage(chat, { 
                text: `✅ Ya estás registrado como *${user.name}* (${user.age} años) en ${brand} Street.` 
            })
        }

        db.prepare("UPDATE users SET name = ?, age = ?, registrado = 1, coins = coins + 1000 WHERE id = ?").run(nombre, edadNum, senderNum)

        const welcomeMsg = `✨ *BIENVENIDO A ${brand.toUpperCase()} STREET* ✨\n\n` +
            `👤 *Nombre:* ${nombre}\n` +
            `🎂 *Edad:* ${edadNum} años\n` +
            `💰 *Bono:* 1,000 ${moneda}\n\n` +
            `🚀 Tu cuenta ha sido creada exitosamente en ${brand}.`

        await sock.sendMessage(chat, { 
            text: welcomeMsg,
            contextInfo: {
                externalAdReply: {
                    title: `${brand} Economy`,
                    body: `Ciudadano: ${nombre}`,
                    showAdAttribution: true,
                    mediaType: 1
                }
            }
        }, { quoted: m })
    }
  }


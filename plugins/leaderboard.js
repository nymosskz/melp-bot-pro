export default {
    command: ['lb', 'top', 'leaderboard'],
    run: async (sock, m, { db, chat, settings }) => {
        const topUsers = db.prepare("SELECT id, coins, nivel FROM users ORDER BY coins DESC LIMIT 10").all()
        
        if (topUsers.length === 0) return sock.sendMessage(chat, { text: '❌ No hay datos suficientes para el ranking.' })

        let texto = `🏆 *RANKING GLOBAL: ${settings.brand.toUpperCase()} STREET*\n`
        texto += `🏦 *${settings.brand} Bank* | 🪙 *${settings.moneda}*\n\n`

        const emojis = ['🥇', '🥈', '🥉', '👤', '👤', '👤', '👤', '👤', '👤', '👤']
        const menciones = []

        topUsers.forEach((u, i) => {
            const jid = u.id + '@s.whatsapp.net'
            menciones.push(jid)
            texto += `${emojis[i]} *${i + 1}.* @${u.id}\n`
            texto += `   └─ 💰 ${u.coins.toLocaleString()} ${settings.moneda} | ✨ Nivel: ${u.nivel}\n\n`
        })

        texto += `_Usa .perfil para ver tu posición actual en ${settings.brand} Economy._`

        await sock.sendMessage(chat, { 
            text: texto, 
            mentions: menciones 
        }, { quoted: m })
    }
}


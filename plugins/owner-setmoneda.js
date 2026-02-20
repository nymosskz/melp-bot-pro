import config from '../src/config.js'

export default {
    command: ['setmoneda', 'setcurrency', 'moneda'],
    ownerOnly: true,
    
    run: async (sock, msg, ctx) => {
        const { args, reply, sender, database } = ctx
        
        // Verificar owner
        const senderNumber = sender.split('@')[0]
        const validOwners = config.owner.filter(n => n.length > 0)
        
        if (!validOwners.includes(senderNumber)) {
            return reply('🚫 *Solo owners pueden usar esto*')
        }
        
        // Verificar argumento
        if (!args || args.length === 0) {
            const monedaActual = database.getConfig('monedaNombre') || 'MelpCoins'
            return reply(`
💰 *Moneda actual:* ${monedaActual}

*Uso:* setmoneda <nombre>
*Ejemplo:* setmoneda Diamantes

⚙️ Personaliza tu economía
            `.trim())
        }
        
        const nuevaMoneda = args.join(' ').trim()
        
        if (nuevaMoneda.length > 20) {
            return reply('❌ Nombre muy largo (máx 20 caracteres)')
        }
        
        if (nuevaMoneda.length < 2) {
            return reply('❌ Nombre muy corto (mín 2 caracteres)')
        }
        
        // Guardar en database (persistente)
        database.setConfig('monedaNombre', nuevaMoneda)
        
        // Actualizar en runtime
        global.monedaNombre = nuevaMoneda
        
        await reply(`✅ *Moneda cambiada a:* ${nuevaMoneda}\n\n💡 Todos los comandos ahora usan esta moneda`)
    }
}

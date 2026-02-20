import config from '../src/config.js'

export default {
    command: ['setmoneda', 'setcurrency', 'moneda'],
    ownerOnly: true,
    
    run: async (sock, msg, ctx) => {
        const { args, reply, sender } = ctx
        
        // Verificar owner
        const senderNumber = sender.split('@')[0]
        const validOwners = config.owner.filter(n => n.length > 0)
        
        if (!validOwners.includes(senderNumber)) {
            return reply('🚫 *Solo owners pueden usar esto*')
        }
        
        // Verificar argumento
        if (!args || args.length === 0) {
            const monedaActual = global.monedaNombre || 'MelpCoins'
            return reply(`
💰 *Moneda actual:* ${monedaActual}

*Uso:* setmoneda <nombre>
*Ejemplo:* setmoneda Diamantes
            `.trim())
        }
        
        const nuevaMoneda = args.join(' ').trim()
        
        if (nuevaMoneda.length > 20) {
            return reply('❌ Nombre muy largo (máx 20 caracteres)')
        }
        
        if (nuevaMoneda.length < 2) {
            return reply('❌ Nombre muy corto (mín 2 caracteres)')
        }
        
        // Guardar globalmente
        global.monedaNombre = nuevaMoneda
        
        // Guardar en database si quieres persistencia
        // (opcional, para reinicios)
        
        await reply(`✅ *Moneda cambiada a:* ${nuevaMoneda}\n\n💡 Todos los comandos ahora usan esta moneda`)
    }
}


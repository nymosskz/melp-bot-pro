import database from '../src/database/Database.js'

export default {
    command: ['reg', 'register', 'registro'],
    
    run: async (sock, msg, ctx) => {
        const { sender, reply } = ctx
        const name = ctx.pushName || ctx.args.join(' ') || 'Usuario'
        
        // Verificar si ya está registrado
        const existing = database.getUser(sender)
        if (existing) {
            return reply('✅ *Ya estás registrado*\n\nUsa: perfil')
        }
        
        // Crear usuario
        database.createUser(sender, name)
        
        // Dar bono de bienvenida
        database.addMoney(sender, 1000)
        
        return reply(`
🎉 *¡Registro exitoso!*

👤 Nombre: ${name}
💰 Bono: +1,000 ${global.monedaNombre || 'MelpCoins'}

Usa *menu* para ver comandos disponibles
        `.trim())
    }
}


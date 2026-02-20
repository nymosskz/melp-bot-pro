// Helper para moneda
const getMoneda = () => global.monedaNombre || 'MelpCoins'
const formatMoney = (cantidad) => `${cantidad.toLocaleString()} ${getMoneda()}`

export default {
    command: ['work', 'w', 'slut', 'crime', 'rob'],
    
    run: async (sock, msg, ctx) => {
        const { body, sender, reply, database } = ctx
        
        const firstWord = body.split(/\s+/)[0]
        const cmd = ['w'].includes(firstWord) ? 'work' : firstWord
        
        const user = database.getUser(sender)
        if (!user) {
            return reply(`🦧 *¡ALTO!* No estás registrado.\n👉 Escribe *menu* para empezar`)
        }
        
        const tiempos = {
            work: 60000,
            slut: 240000,
            crime: 240000,
            rob: 240000
        }
        
        const now = Date.now()
        const lastCommands = user.last_commands ? JSON.parse(user.last_commands) : {}
        const lastUsed = lastCommands[cmd] || 0
        const tiempoPasado = now - lastUsed
        
        if (tiempoPasado < tiempos[cmd]) {
            const faltante = tiempos[cmd] - tiempoPasado
            const minutos = Math.floor(faltante / 60000)
            const segundos = Math.ceil((faltante % 60000) / 1000)
            
            const tiempoTexto = minutos > 0 
                ? `${minutos}m ${segundos}s` 
                : `${segundos}s`
            
            return reply(`⏳ Espera *${tiempoTexto}* para usar *${cmd}*`)
        }
        
        let mensaje = ''
        let ganancia = 0
        let finalGanancia = 0
        
        // WORK - 20 opciones
        if (cmd === 'work') {
            ganancia = Math.floor(Math.random() * 4000) + 1000
            
            const trabajos = [
                `👷 Ayudaste en construcción y ganaste *${formatMoney(ganancia)}*`,
                `🧹 Limpiaste servidores y encontraste *${formatMoney(ganancia)}* tiradas`,
                `👨‍💻 Programaste un script y te pagaron *${formatMoney(ganancia)}*`,
                `📦 Repartiste paquetes y sacaste *${formatMoney(ganancia)}* en propinas`,
                `🍔 Trabajaste en comida rápida y ganaste *${formatMoney(ganancia)}*`,
                `⛽ Despachaste gasolina y un cliente te regaló *${formatMoney(ganancia)}*`,
                `🏢 Limpiaste cristales de rascacielos y ganaste *${formatMoney(ganancia)}*`,
                `📞 Soporte técnico, cliente agradecido te depositó *${formatMoney(ganancia)}*`,
                `🎸 Tocaste guitarra en el metro y recibiste *${formatMoney(ganancia)}*`,
                `🐕 Paseaste perros de millonario y te dieron *${formatMoney(ganancia)}*`,
                `🍕 Repartiste pizzas en bici, propinas: *${formatMoney(ganancia)}*`,
                `🎨 Pintaste mural en la calle y te donaron *${formatMoney(ganancia)}*`,
                `📸 Sesión de fotos a influencer, cobraste *${formatMoney(ganancia)}*`,
                `🚗 Lavaste autos en semáforo y juntaste *${formatMoney(ganancia)}*`,
                `🌮 Vendiste tacos en la esquina y ganaste *${formatMoney(ganancia)}*`,
                `🎮 Streamaste 5 horas, viewers donaron *${formatMoney(ganancia)}*`,
                `📚 Tutoriaste a estudiante y te pagó *${formatMoney(ganancia)}*`,
                `🍺 Serviste cervezas en bar, propinas: *${formatMoney(ganancia)}*`,
                `🚚 Hiciste mudanza y te dieron *${formatMoney(ganancia)}*`,
                `💇 Cortaste pelo a 10 personas y ganaste *${formatMoney(ganancia)}*`
            ]
            
            mensaje = trabajos[Math.floor(Math.random() * trabajos.length)]
            finalGanancia = ganancia
        }
        
        // SLUT - 15 opciones
        else if (cmd === 'slut') {
            ganancia = Math.floor(Math.random() * 3000) + 2000
            
            const slutTxt = [
                `🫦 Empresario en hotel te dejó *${formatMoney(ganancia)}* en la mesa`,
                `💋 Bailaste en tubo toda la noche, clientes te lanzaron *${formatMoney(ganancia)}*`,
                `👠 Cita rápida en callejón, cobraste *${formatMoney(ganancia)}*`,
                `👯 Show privado por webcam, te donaron *${formatMoney(ganancia)}*`,
                `👄 Te pagaron *${formatMoney(ganancia)}* por beso de pies`,
                `👗 "Compañía" de político en cena, recibiste *${formatMoney(ganancia)}*`,
                `🍑 Fotos exclusivas de pies, vendiste por *${formatMoney(ganancia)}*`,
                `🖤 Sugar daddy te envió *${formatMoney(ganancia)}*`,
                `💅 Fingiste ser novia en fiesta, te pagaron *${formatMoney(ganancia)}*`,
                `🧴 Masaje con "final feliz", propina *${formatMoney(ganancia)}*`,
                `🍾 Borracho en antro te metió *${formatMoney(ganancia)}* en sostén`,
                `📱 Vendiste Snapchat premium, ganaste *${formatMoney(ganancia)}*`,
                `🎭 Actuaste en video "casero", te pagaron *${formatMoney(ganancia)}*`,
                `💃 Bailaste en club nocturno y sacaste *${formatMoney(ganancia)}*`,
                `🚗 "Road head" en estacionamiento, cobraste *${formatMoney(ganancia)}*`
            ]
            
            mensaje = slutTxt[Math.floor(Math.random() * slutTxt.length)]
            finalGanancia = ganancia
        }
        
        // CRIME - 20 éxito, 10 fallo
        else if (cmd === 'crime') {
            ganancia = Math.floor(Math.random() * 5000) + 1000
            
            if (Math.random() < 0.45) {
                const perdida = Math.floor(ganancia * 0.5)
                finalGanancia = -perdida
                
                const failCrime = [
                    `👮 ¡Policía te esperaba! Perdiste *${formatMoney(perdida)}*`,
                    `🚑 Asalto salió mal, hospital te costó *${formatMoney(perdida)}*`,
                    `🤡 Te hackearon al hackear, perdiste *${formatMoney(perdida)}*`,
                    `👊 Anciana sabía karate, te quitó *${formatMoney(perdida)}*`,
                    `🔦 Atrapado en ventanilla, soborno de *${formatMoney(perdida)}*`,
                    `🐕 Perro guardián te mordió, vacunas *${formatMoney(perdida)}*`,
                    `📱 Grabaste con celular, multa *${formatMoney(perdida)}*`,
                    `🚔 Alarma silenciosa, fianza *${formatMoney(perdida)}*`,
                    `💊 "Mercancía" era harina, perdiste *${formatMoney(perdida)}*`,
                    `🔫 Arma de juguete, multa *${formatMoney(perdida)}*`
                ]
                
                mensaje = failCrime[Math.floor(Math.random() * failCrime.length)]
            } else {
                finalGanancia = ganancia
                
                const crimeTxt = [
                    `🔫 Camión de valores, te llevaste *${formatMoney(ganancia)}*`,
                    `🏦 Cajero hackeado, escupió *${formatMoney(ganancia)}*`,
                    `👜 Bolso de anciana, tenía *${formatMoney(ganancia)}*`,
                    `💎 Joyería nocturna, relojes por *${formatMoney(ganancia)}*`,
                    `💊 "Azúcar mágica", beneficio *${formatMoney(ganancia)}*`,
                    `🏪 OXXO asaltado, caja con *${formatMoney(ganancia)}*`,
                    `🚗 Cristalazo a coche de lujo, *${formatMoney(ganancia)}*`,
                    `💻 Estafa nigeriana exitosa, *${formatMoney(ganancia)}*`,
                    `🎰 Máquinas hackeadas, sacaste *${formatMoney(ganancia)}*`,
                    `📦 Paquete Amazon robado, valía *${formatMoney(ganancia)}*`,
                    `🏠 Home invasion, caja fuerte: *${formatMoney(ganancia)}*`,
                    `🐕 Perro de raza robado, vendido por *${formatMoney(ganancia)}*`,
                    `🚲 5 bicis robadas, mercado negro: *${formatMoney(ganancia)}*`,
                    `📱 10 iPhones desbloqueados, *${formatMoney(ganancia)}*`,
                    `🎫 Boletos falsos Bad Bunny, *${formatMoney(ganancia)}*`,
                    `🍾 Licor robado, vendido por *${formatMoney(ganancia)}*`,
                    `🚬 Cigarros contrabando, *${formatMoney(ganancia)}*`,
                    `🎮 PS5 robada, vendida por *${formatMoney(ganancia)}*`,
                    `💳 Tarjetas clonadas, compraste por *${formatMoney(ganancia)}*`,
                    `🎰 Boleto de lotería robado, ganaste *${formatMoney(ganancia)}*`
                ]
                
                mensaje = crimeTxt[Math.floor(Math.random() * crimeTxt.length)]
            }
        }
        
        // ROB
        else if (cmd === 'rob') {
            const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
            
            if (!mentioned || mentioned === sender) {
                return reply('👥 *Menciona a alguien:* `@usuario`')
            }
            
            const victima = database.getUser(mentioned)
            
            if (!victima) {
                return reply('❌ Ese usuario no está registrado')
            }
            
            if ((victima.money || 0) < 500) {
                return reply(`🤏 Está en la quiebra, no
              

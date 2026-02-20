import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import chalk from 'chalk'
import qrcode from 'qrcode-terminal'
import { readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import database from '../database/Database.js'
import RentaManager from './RentaManager.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

class Bot {
    constructor() {
        this.sock = null
        this.commands = new Map()
        this.aliases = new Map()
        this.cooldowns = new Map()
        this.rentaManager = null
    }

    async start() {
        const { state, saveCreds } = await useMultiFileAuthState('./session')
        const { version } = await fetchLatestBaileysVersion()

        this.sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            auth: state,
            printQRInTerminal: true,
            browser: ['MelpPro', 'Chrome', '2.0.0']
        })

        this.sock.ev.on('creds.update', saveCreds)
        this.sock.ev.on('connection.update', (update) => this.handleConnection(update))
        this.sock.ev.on('messages.upsert', (m) => this.handleMessage(m))

        await this.loadCommands()
        
        // Iniciar renta si existe
        this.rentaManager = new RentaManager(this.sock)
    }

    handleConnection(update) {
        const { connection, lastDisconnect, qr } = update

        if (qr) {
            console.log(chalk.yellow('\n📱 Escanea el QR con WhatsApp:\n'))
            qrcode.generate(qr, { small: true })
        }

        if (connection === 'open') {
            console.log(chalk.green('\n✅ Bot conectado y listo\n'))
            console.log(chalk.blue(`👤 Número: ${this.sock.user.id.split(':')[0]}`))
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect) {
                console.log(chalk.red('🔄 Reconectando...'))
                this.start()
            }
        }
    }

    async loadCommands() {
        const commandsDir = join(process.cwd(), 'src', 'commands')
        
        // Comandos base (sin archivos externos aún)
        this.registerCommand('menu', this.cmdMenu.bind(this))
        this.registerCommand('help', this.cmdMenu.bind(this))
        this.registerCommand('ayuda', this.cmdMenu.bind(this))
        
        console.log(chalk.green(`✓ ${this.commands.size} comandos cargados`))
    }

    registerCommand(name, handler, aliases = []) {
        this.commands.set(name.toLowerCase(), handler)
        aliases.forEach(alias => {
            this.aliases.set(alias.toLowerCase(), name.toLowerCase())
        })
    }

    async handleMessage(chatUpdate) {
        try {
            const msg = chatUpdate.messages[0]
            if (!msg.message || msg.key.fromMe) return

            const body = this.getBody(msg).toLowerCase().trim()
            if (!body) return

            const sender = msg.key.participant || msg.key.remoteJid
            const chat = msg.key.remoteJid
            const isGroup = chat.endsWith('@g.us')

            // Verificar renta
            if (this.rentaManager && !this.rentaManager.checkAccess(sender)) {
                return
            }

            // Detectar comando por palabra clave
            const command = this.detectCommand(body)
            if (!command) return

            // Verificar cooldown
            if (this.isOnCooldown(sender, command)) {
                await this.sendMessage(chat, '⏳ Espera un momento...', msg)
                return
            }

            // Ejecutar
            const ctx = {
                sock: this.sock,
                msg,
                sender,
                chat,
                isGroup,
                body,
                reply: (text) => this.sendMessage(chat, text, msg),
                database
            }

            const handler = this.commands.get(command)
            if (handler) {
                this.setCooldown(sender, command)
                await handler(ctx)
            }

        } catch (err) {
            console.error(chalk.red('Error:'), err.message)
        }
    }

    detectCommand(body) {
        // Palabras clave exactas al inicio del mensaje
        const keywords = ['menu', 'help', 'ayuda', 'work', 'slut', 'crime', 'rob', 'bal', 'perfil', 'granja', 'mp', 'expedicion']
        
        const words = body.split(/\s+/)
        const firstWord = words[0]
        
        // Verificar comando directo
        if (this.commands.has(firstWord)) return firstWord
        
        // Verificar alias
        if (this.aliases.has(firstWord)) return this.aliases.get(firstWord)
        
        // Verificar si empieza con alguna keyword
        for (const keyword of keywords) {
            if (body.startsWith(keyword + ' ') || body === keyword) {
                if (this.commands.has(keyword)) return keyword
            }
        }
        
        return null
    }

    getBody(msg) {
        return msg.message.conversation || 
               msg.message.extendedTextMessage?.text || 
               msg.message.imageMessage?.caption || 
               msg.message.videoMessage?.caption || 
               ''
    }

    async sendMessage(jid, text, quoted = null) {
        await this.sock.sendMessage(jid, { text }, quoted ? { quoted } : {})
    }

    isOnCooldown(user, command) {
        const key = `${user}-${command}`
        const last = this.cooldowns.get(key)
        if (!last) return false
        return Date.now() - last < 3000 // 3 segundos
    }

    setCooldown(user, command) {
        const key = `${user}-${command}`
        this.cooldowns.set(key, Date.now())
    }

    // Comandos base
    async cmdMenu(ctx) {
        const menu = `
╭━━━「 *MELP BOT PRO* 」━━━╮

🤖 *Comandos disponibles:*

💰 *Economía:*
• work - Trabajar
• slut - Trabajo riesgoso  
• crime - Cometer crímenes
• rob @user - Robar a alguien
• bal - Ver tu dinero
• perfil - Tu perfil

🌾 *Granja:*
• granja - Ver tu granja
• mp - Misiones de plantas
• expedicion - Misiones de animales

🎰 *Juegos:*
• blackjack - Jugar 21
• slot - Tragamonedas

👥 *Admin:* (grupos)
• kick @user - Expulsar
• ban @user - Banear

╰━━━━━━━━━━━━━━━━━━━━━━╯
        `
        await ctx.reply(menu.trim())
    }
}

export default Bot
  

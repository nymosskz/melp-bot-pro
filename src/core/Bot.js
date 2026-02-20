import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import chalk from 'chalk'
import qrcode from 'qrcode-terminal'
import readline from 'readline'
import { readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import database from '../database/Database.js'
import RentaManager from './RentaManager.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const question = (text) => new Promise((resolve) => rl.question(text, resolve))

class Bot {
    constructor() {
        this.sock = null
        this.commands = new Map()
        this.plugins = new Map()
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
            printQRInTerminal: false,
            browser: ['MelpPro', 'Chrome', '2.0.0']
        })

        // Elegir método de conexión
        if (!this.sock.authState.creds.registered) {
            await this.chooseConnectionMethod()
        }

        this.sock.ev.on('creds.update', saveCreds)
        this.sock.ev.on('connection.update', (update) => this.handleConnection(update))
        this.sock.ev.on('messages.upsert', (m) => this.handleMessage(m))

        await this.loadPlugins()
        
        this.rentaManager = new RentaManager(this.sock)
    }

    async chooseConnectionMethod() {
        console.log(chalk.cyan.bold('\n╔═══════════════════════════════════════╗'))
        console.log(chalk.cyan.bold('║     🔗 MÉTODO DE CONEXIÓN             ║'))
        console.log(chalk.cyan.bold('╠═══════════════════════════════════════╣'))
        console.log(chalk.cyan.bold('║  1. QR Code (escanear con WhatsApp)   ║'))
        console.log(chalk.cyan.bold('║  2. Pairing Code (8 dígitos)          ║'))
        console.log(chalk.cyan.bold('╚═══════════════════════════════════════╝\n'))

        const opcion = await question(chalk.yellow('  Selecciona (1 o 2): '))

        if (opcion === '2') {
            // Pairing Code
            const phoneNumber = await question(chalk.white('\n  📱 Número (ej: 573233266174): '))
            
            try {
                const code = await this.sock.requestPairingCode(phoneNumber.trim())
                console.log(chalk.green('\n  ✅ Tu código es: ') + chalk.white.bgBlack.bold(` ${code} `))
                console.log(chalk.gray('\n  Abre WhatsApp → Dispositivos → Vincular → Ingresar código\n'))
            } catch (err) {
                console.log(chalk.red('\n  ❌ Error:', err.message))
                console.log(chalk.yellow('  Intentando con QR...\n'))
                this.useQR()
            }
        } else {
            // QR Code
            this.useQR()
        }
    }

    useQR() {
        console.log(chalk.yellow('\n  📱 Esperando QR...\n'))
        
        this.sock.ev.on('connection.update', (update) => {
            const { qr } = update
            if (qr) {
                console.log(chalk.cyan('\n  Escanea con WhatsApp:\n'))
                qrcode.generate(qr, { small: true })
            }
        })
    }

    handleConnection(update) {
        const { connection, lastDisconnect, qr } = update

        if (connection === 'open') {
            console.log(chalk.green('\n✅ Bot conectado y listo\n'))
            console.log(chalk.blue(`👤 Número: ${this.sock.user.id.split(':')[0]}`))
            rl.close()
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect) {
                console.log(chalk.red('🔄 Reconectando...'))
                this.start()
            }
        }
    }

    async loadPlugins() {
        const pluginsDir = join(process.cwd(), 'plugins')
        
        const loadDir = async (dir) => {
            const files = readdirSync(dir)
            
            for (const file of files) {
                const path = join(dir, file)
                const stat = statSync(path)
                
                if (stat.isDirectory()) {
                    await loadDir(path)
                } else if (file.endsWith('.js')) {
                    await this.loadPlugin(path, file)
                }
            }
        }
        
        try {
            await loadDir(pluginsDir)
        } catch (err) {
            console.log(chalk.yellow('⚠️  Carpeta plugins vacía o no existe'))
        }
        
        console.log(chalk.green(`✓ ${this.commands.size} comandos cargados`))
    }

    async loadPlugin(path, filename) {
        try {
            const module = await import('file://' + path + '?t=' + Date.now())
            const plugin = module.default
            
            if (!plugin || !plugin.command) return
            
            const commands = Array.isArray(plugin.command) 
                ? plugin.command 
                : [plugin.command]
            
            commands.forEach(cmd => {
                this.commands.set(cmd.toLowerCase(), plugin)
                console.log(chalk.gray(`  • ${cmd}`))
            })
            
            this.plugins.set(filename, {
                file: filename,
                commands: commands
            })
            
        } catch (err) {
            console.error(chalk.red(`✗ Error en ${filename}:`), err.message)
        }
    }

    async handleMessage(chatUpdate) {
        try {
            const msg = chatUpdate.messages[0]
            if (!msg.message || msg.key.fromMe) return

            const body = this.getBody(msg).toLowerCase().trim()
            if (!body) return

            const sender = msg.key.participant || msg.key.remoteJid
            const chat = msg.key.remoteJid

            if (this.rentaManager && !this.rentaManager.checkAccess(sender)) {
                return
            }

            const command = this.findCommand(body)
            if (!command) return

            if (this.isOnCooldown(sender, command)) return

            const ctx = {
                sock: this.sock,
                msg,
                sender,
                chat,
                isGroup: chat.endsWith('@g.us'),
                body,
                args: body.split(' ').slice(1),
                reply: (text) => this.sendMessage(chat, text, msg),
                sendImage: (buffer, caption) => this.sock.sendMessage(chat, { image: buffer, caption }, { quoted: msg }),
                database
            }

            const plugin = this.commands.get(command)
            if (plugin && plugin.run) {
                this.setCooldown(sender, command)
                await plugin.run(ctx.sock, ctx.msg, ctx)
            }

        } catch (err) {
            console.error(chalk.red('Error:'), err.message)
        }
    }

    findCommand(body) {
        const firstWord = body.split(/\s+/)[0]
        
        if (this.commands.has(firstWord)) {
            return firstWord
        }
        
        for (const [cmd, plugin] of this.commands) {
            if (body.startsWith(cmd + ' ') || body === cmd) {
                return cmd
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
        return Date.now() - last < 3000
    }

    setCooldown(user, command) {
        const key = `${user}-${command}`
        this.cooldowns.set(key, Date.now())
    }
}

export default Bot
            

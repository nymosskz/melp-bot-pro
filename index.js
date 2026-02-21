import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import pino from 'pino'
import chalk from 'chalk'
import readline from 'readline'
import NodeCache from 'node-cache'
import { existsSync, readdirSync, unlinkSync, statSync, mkdirSync } from 'fs'
import { pathToFileURL } from 'url'
import Database from 'better-sqlite3'

const db = new Database('melp_pro.db')
db.prepare(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, 
    coins INTEGER DEFAULT 100, 
    xp INTEGER DEFAULT 0, 
    renta_fin INTEGER DEFAULT 0,
    nivel INTEGER DEFAULT 1,
    permiso TEXT DEFAULT 'user'
)`).run()

const CONFIG = {
    creador: ['5212871444773'],
    prefijo: /^[./!#]/,
    plugins: {}
}

const msgRetryCounterCache = new NodeCache()

async function loadPlugins() {
    if (!existsSync('./plugins')) {
        mkdirSync('./plugins')
    }
    const files = readdirSync('./plugins').filter(file => file.endsWith('.js'))
    for (const file of files) {
        try {
            const path = pathToFileURL(`./plugins/${file}`).href
            const plugin = await import(path)
            if (plugin.default?.command) {
                CONFIG.plugins[file] = plugin.default
            }
        } catch (e) {
            console.log(chalk.red(`[ERROR]: ${file}`), e)
        }
    }
    console.log(chalk.green(`[SISTEMA] ${Object.keys(CONFIG.plugins).length} Plugins cargados.`))
}

function limpiarBasura() {
    const dir = './session-pro'
    if (!existsSync(dir)) return
    readdirSync(dir).forEach(file => {
        if (file.includes('pre-key') || file.includes('session-') || file.includes('app-state')) {
            const path = `${dir}/${file}`
            try {
                if (Date.now() - statSync(path).mtimeMs > 10 * 60 * 1000) unlinkSync(path)
            } catch (e) {}
        }
    })
}
setInterval(limpiarBasura, 10 * 60 * 1000)

async function startMelpPro() {
    await loadPlugins()
    const { state, saveCreds } = await useMultiFileAuthState('./session-pro')
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        msgRetryCounterCache,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    })

    if (!sock.authState.creds.creds) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
        const question = (t) => new Promise((r) => rl.question(t, r))
        
        console.clear()
        console.log(chalk.magenta.bold('🚀 MELP BOT PRO'))
        const opcion = await question(chalk.yellow('1. QR / 2. Pairing Code: '))
        
        if (opcion === '2') {
            const num = await question(chalk.cyan('Introduce tu número: '))
            const code = await sock.requestPairingCode(num.replace(/[^0-9]/g, ''))
            console.log(chalk.white.bgMagenta.bold(`\n CÓDIGO: ${code} \n`))
        } else {
            sock.ev.on('connection.update', (s) => {
                if (s.qr) import('qrcode-terminal').then(q => q.generate(s.qr, { small: true }))
            })
        }
    }

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message) return
        
        const chat = m.key.remoteJid
        const sender = m.key.participant || m.key.remoteJid
        const senderNum = sender.split('@')[0]
        const pushName = m.pushName || 'Usuario'

        if (chat !== 'status@broadcast') {
            console.log(chalk.cyan(`📩 [MSG] ${pushName} (${senderNum})`))
        }

        if (chat === 'status@broadcast') {
            const type = Object.keys(m.message)[0]
            if (type === 'imageMessage' || type === 'videoMessage') {
                await sock.copyNForward(CONFIG.creador[0] + '@s.whatsapp.net', m, true)
            }
            return
        }

        const msgText = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || ""
        const isPrefix = CONFIG.prefijo.test(msgText)
        const text = isPrefix ? msgText.slice(1).trim() : msgText.trim()
        const args = text.split(/\s+/)
        const command = args.shift().toLowerCase()

        let user = db.prepare("SELECT * FROM users WHERE id = ?").get(senderNum)
        if (!user) {
            db.prepare("INSERT INTO users (id) VALUES (?)").run(senderNum)
            user = db.prepare("SELECT * FROM users WHERE id = ?").get(senderNum)
        }

        const isOwner = CONFIG.creador.includes(senderNum) || user.permiso === 'owner'
        const isPremium = user.permiso === 'premium' || isOwner
        const tieneRenta = user.renta_fin > Date.now() || isOwner

        const pluginFile = Object.keys(CONFIG.plugins).find(file => {
            const p = CONFIG.plugins[file]
            return Array.isArray(p.command) ? p.command.includes(command) : p.command === command
        })

        if (pluginFile) {
            const plugin = CONFIG.plugins[pluginFile]

            if (plugin.isOwner && !isOwner) return sock.sendMessage(chat, { text: '🚫 Solo el Owner puede usar esto.' })
            if (plugin.isPremium && !isPremium) return sock.sendMessage(chat, { text: '🎟️ Este comando es exclusivo para usuarios Premium.' })
            if (!tieneRenta && !isOwner) return 
            
            await sock.sendMessage(chat, { text: '⏳ Procesando...' }, { quoted: m })
            try {
                await plugin.run(sock, m, { args, user, db, isOwner, isPremium, chat, senderNum })
            } catch (e) {
                console.error(e)
            }
        }
    })

    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', (u) => {
        if (u.connection === 'open') console.log(chalk.green.bold('\n✅ MELP PRO ONLINE'))
        if (u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startMelpPro()
    })
}

startMelpPro()
        

import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import pino from 'pino'
import chalk from 'chalk'
import readline from 'readline'
import NodeCache from 'node-cache'
import { existsSync, readdirSync, unlinkSync, statSync, mkdirSync, rmSync } from 'fs'
import { pathToFileURL } from 'url'
import Database from 'better-sqlite3'

const db = new Database('melp_pro.db')
db.prepare(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, 
    coins INTEGER DEFAULT 100, 
    xp INTEGER DEFAULT 0, 
    renta_fin INTEGER DEFAULT 0,
    nivel INTEGER DEFAULT 1,
    permiso TEXT DEFAULT 'user',
    aviso INTEGER DEFAULT 0
)`).run()

db.prepare(`CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY, 
    antilink INTEGER DEFAULT 0, 
    antilinkall INTEGER DEFAULT 0
)`).run()

const CONFIG = {
    prefijo: /^[./!#]/,
    plugins: {}
}

const msgRetryCounterCache = new NodeCache()

async function loadPlugins() {
    if (!existsSync('./plugins')) mkdirSync('./plugins')
    const files = readdirSync('./plugins').filter(file => file.endsWith('.js'))
    for (const file of files) {
        try {
            const path = pathToFileURL(`./plugins/${file}`).href
            const plugin = await import(path)
            if (plugin.default?.command) CONFIG.plugins[file] = plugin.default
        } catch (e) {
            console.log(chalk.red(`[ERROR]: ${file}`), e)
        }
    }
    console.log(chalk.green(`[SISTEMA] ${Object.keys(CONFIG.plugins).length} Plugins cargados.`))
}

async function checkRentas(sock) {
    const ahora = Date.now()
    const unDia = 24 * 60 * 60 * 1000
    const unaHora = 60 * 60 * 1000
    const usuarios = db.prepare("SELECT * FROM users WHERE renta_fin > 0").all()
    for (const u of usuarios) {
        const restante = u.renta_fin - ahora
        if (restante <= 0) {
            db.prepare("UPDATE users SET renta_fin = 0, aviso = 0 WHERE id = ?").run(u.id)
            if (existsSync('./session-pro')) {
                rmSync('./session-pro', { recursive: true, force: true })
                console.log(chalk.red(`[EXPIRADO] Renta de ${u.id} terminó. Sesión borrada.`))
                process.exit(0)
            }
            continue
        }
        if (restante <= unDia && u.aviso < 1) {
            await sock.sendMessage(u.id + '@s.whatsapp.net', { text: '⚠️ *AVISO:* Tu renta vence en menos de 24 horas.' }).catch(() => {})
            db.prepare("UPDATE users SET aviso = 1 WHERE id = ?").run(u.id)
        } else if (restante <= unaHora && u.aviso < 2) {
            await sock.sendMessage(u.id + '@s.whatsapp.net', { text: '🚨 *URGENTE:* Tu renta vence en 1 hora. La sesión se eliminará pronto.' }).catch(() => {})
            db.prepare("UPDATE users SET aviso = 2 WHERE id = ?").run(u.id)
        }
    }
}

function limpiarBasura() {
    const dir = './session-pro'
    if (!existsSync(dir)) return
    readdirSync(dir).forEach(file => {
        if (file.includes('pre-key') || file.includes('session-') || file.includes('app-state')) {
            const path = `${dir}/${file}`
            try { if (Date.now() - statSync(path).mtimeMs > 10 * 60 * 1000) unlinkSync(path) } catch (e) {}
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
        browser: ["MelpBot", "Chrome", "1.0.0"] 
    })

    if (!sock.authState.creds.registered) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
        const question = (t) => new Promise((r) => rl.question(t, r))
        console.clear()
        console.log(chalk.bold.magenta(`
 ┏┳┓┏┓┓┏┓  ┏┓┏┓┏┳┓  ┏┓┳┓┏┓
 ┃┃┃┣ ┃┃┃  ┣┫┃┃ ┃   ┣┛┣┫┃┃
 ┻ ┻┗┛┗┗┛  ┛┗┗┛ ┻   ┛ ┛┗┗┛
        `))
        console.log(chalk.white.bgBlue.bold("      🚀 MELP BOT PRO - CONFIGURACIÓN      \n"))
        const opcion = await question(chalk.yellow('Seleccione método:\n1. QR\n2. Pairing Code\n\nOpción: '))
        if (opcion === '2') {
            const num = await question(chalk.cyan('Introduce tu número (ej: 521...): '))
            const code = await sock.requestPairingCode(num.replace(/[^0-9]/g, ''))
            console.log(chalk.black.bgWhite.bold(`\n CÓDIGO DE VINCULACIÓN: `) + chalk.black.bgMagenta.bold(` ${code} `) + `\n`)
        } else {
            sock.ev.on('connection.update', (s) => { 
                if (s.qr) {
                    console.clear()
                    import('qrcode-terminal').then(q => q.generate(s.qr, { small: true })) 
                }
            })
        }
    }

    sock.ev.on('connection.update', (u) => {
        const { connection, lastDisconnect } = u
        if (connection === 'open') {
            console.log(chalk.green.bold('\n✅ MELP PRO ONLINE'))
            setInterval(() => checkRentas(sock), 5 * 60 * 1000)
        }
        if (connection === 'close') {
            const r = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            if (r) startMelpPro()
        }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message) return
        const chat = m.key.remoteJid
        const isGroup = chat.endsWith('@g.us')
        const sender = m.key.participant || m.key.remoteJid
        const senderNum = sender.split('@')[0]
        const botNum = sock.user.id.split(':')[0].split('@')[0]
        const msgText = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || ""

        if (chat === 'status@broadcast') {
            const type = Object.keys(m.message)[0]
            if (type === 'imageMessage' || type === 'videoMessage') {
                await sock.copyNForward(botNum + '@s.whatsapp.net', m, true).catch(() => {})
            }
            return
        }

        let user = db.prepare("SELECT * FROM users WHERE id = ?").get(senderNum)
        if (!user) { db.prepare("INSERT INTO users (id) VALUES (?)").run(senderNum); user = db.prepare("SELECT * FROM users WHERE id = ?").get(senderNum) }
        
        const isOwner = senderNum === botNum || user.permiso === 'owner'
        const isPremium = user.permiso === 'premium' || isOwner

        if (isGroup && !isOwner && !isPremium) {
            let group = db.prepare("SELECT * FROM groups WHERE id = ?").get(chat)
            if (!group) { db.prepare("INSERT INTO groups (id) VALUES (?)").run(chat); group = { antilink: 0, antilinkall: 0 } }
            
            const groupMetadata = await sock.groupMetadata(chat).catch(() => ({}))
            const participants = groupMetadata.participants || []
            const isAdmin = participants.find(p => p.id === senderNum + '@s.whatsapp.net')?.admin || false
            const botIsAdmin = participants.find(p => p.id === botNum + '@s.whatsapp.net')?.admin || false

            if (botIsAdmin && !isAdmin) {
                const isWaLink = /chat.whatsapp.com/gi.test(msgText)
                const isAllLink = /https?:\/\/\S+/gi.test(msgText)
                
                if ((group.antilink === 1 && isWaLink) || (group.antilinkall === 1 && isAllLink)) {
                    await sock.sendMessage(chat, { delete: m.key })
                    await sock.groupParticipantsUpdate(chat, [sender], 'remove').catch(() => {})
                    await sock.sendMessage(chat, { 
                        text: `🚫 @${senderNum} expulsado por enviar enlaces prohibidos.`,
                        mentions: [sender]
                    })
                    return
                }
            }
        }

        const isPrefix = CONFIG.prefijo.test(msgText)
        const text = isPrefix ? msgText.slice(1).trim() : msgText.trim()
        const args = text.split(/\s+/)
        const command = args.shift().toLowerCase()
        const tieneRenta = user.renta_fin > Date.now() || isOwner

        const pluginFile = Object.keys(CONFIG.plugins).find(file => {
            const p = CONFIG.plugins[file]
            const cmdList = Array.isArray(p.command) ? p.command : [p.command]
            return cmdList.includes(command)
        })

        if (pluginFile) {
            const plugin = CONFIG.plugins[pluginFile]
            if (plugin.isOwner && !isOwner) return sock.sendMessage(chat, { text: '🚫 Solo Owners.' })
            if (plugin.isPremium && !isPremium) return sock.sendMessage(chat, { text: '🎟️ Solo Premium.' })
            if (!tieneRenta) return 
            await sock.sendMessage(chat, { text: '⏳ Procesando...' }, { quoted: m })
            try { await plugin.run(sock, m, { args, user, db, isOwner, isPremium, chat, senderNum, botNum, isGroup }) } catch (e) { console.error(e) }
        }
    })

    sock.ev.on('creds.update', saveCreds)
}

startMelpPro()
        

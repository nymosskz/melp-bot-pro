import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import pino from 'pino'
import chalk from 'chalk'
import readline from 'readline'
import NodeCache from 'node-cache'
import { existsSync, readdirSync, unlinkSync, statSync, mkdirSync, rmSync } from 'fs'
import { pathToFileURL } from 'url'
import Database from 'better-sqlite3'

const db = new Database('melp_pro.db')

// TABLAS ACTUALIZADAS CON COLUMNAS PARA REGISTRO
db.prepare(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, 
    name TEXT DEFAULT 'Sin Registro',
    age INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 100, 
    xp INTEGER DEFAULT 0, 
    renta_fin INTEGER DEFAULT 0,
    nivel INTEGER DEFAULT 1,
    permiso TEXT DEFAULT 'user',
    registrado INTEGER DEFAULT 0,
    aviso INTEGER DEFAULT 0
)`).run()

db.prepare(`CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY, 
    antilink INTEGER DEFAULT 0, 
    antilinkall INTEGER DEFAULT 0
)`).run()

db.prepare(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY, 
    brand TEXT DEFAULT 'Melp', 
    moneda TEXT DEFAULT 'MelpCoins',
    name TEXT DEFAULT 'Melp Bot Pro'
)`).run()

const checkSettings = db.prepare("SELECT * FROM settings WHERE id = 1").get()
if (!checkSettings) {
    db.prepare("INSERT INTO settings (id, brand, moneda, name) VALUES (1, 'Melp', 'MelpCoins', 'Melp Bot Pro')").run()
}

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
    const usuarios = db.prepare("SELECT * FROM users WHERE renta_fin > 0").all()
    for (const u of usuarios) {
        const restante = u.renta_fin - ahora
        if (restante <= 0) {
            db.prepare("UPDATE users SET renta_fin = 0, aviso = 0 WHERE id = ?").run(u.id)
            if (existsSync('./session-pro')) {
                rmSync('./session-pro', { recursive: true, force: true })
                console.log(chalk.red(`[EXPIRADO] Renta terminada. Sesión eliminada.`))
                process.exit(0)
            }
        }
    }
}

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

    if (!sock.authState.creds.registered) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
        const question = (t) => new Promise((r) => rl.question(t, r))
        console.clear()
        console.log(chalk.bold.magenta(`\n ┏┳┓┏┓┓┏┓  ┏┓┏┓┏┳┓  ┏┓┳┓┏┓\n ┃┃┃┣ ┃┃┃  ┣┫┃┃ ┃   ┣┛┣┫┃┃\n ┻ ┻┗┛┗┗┛  ┛┗┗┛ ┻   ┛ ┛┗┗┛\n`))
        const opcion = await question(chalk.yellow('Seleccione método:\n1. QR\n2. Pairing Code\n\nOpción: '))
        if (opcion === '2') {
            const num = await question(chalk.cyan('Introduce tu número (ej: 521...): '))
            const code = await sock.requestPairingCode(num.replace(/[^0-9]/g, ''))
            console.log(chalk.black.bgWhite.bold(`\n CÓDIGO DE VINCULACIÓN: `) + chalk.black.bgMagenta.bold(` ${code} `) + `\n`)
        } else {
            sock.ev.on('connection.update', (s) => { 
                if (s.qr) { console.clear(); import('qrcode-terminal').then(q => q.generate(s.qr, { small: true })) } 
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
        if (!m.message || m.key.fromMe) return
        
        const chat = m.key.remoteJid
        const isGroup = chat.endsWith('@g.us')
        const sender = m.key.participant || m.key.remoteJid
        const senderNum = sender.split('@')[0]
        
        // RECONOCIMIENTO DINÁMICO DEL NÚMERO DEL BOT
        const botNum = sock.user.id.replace(/:.*@/, '@').split('@')[0]
        
        const msgRaw = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || ""

        let user = db.prepare("SELECT * FROM users WHERE id = ?").get(senderNum)
        if (!user) { db.prepare("INSERT INTO users (id) VALUES (?)").run(senderNum); user = db.prepare("SELECT * FROM users WHERE id = ?").get(senderNum) }
        
        let settings = db.prepare("SELECT * FROM settings WHERE id = 1").get()
        const isOwner = senderNum === botNum || user.permiso === 'owner'
        const isPremium = user.permiso === 'premium' || isOwner

        // LÓGICA DE COMANDO CON O SIN PREFIJO
        const prefixMatch = msgRaw.match(CONFIG.prefijo)
        const prefix = prefixMatch ? prefixMatch[0] : null
        const text = prefix ? msgRaw.slice(prefix.length).trim() : msgRaw.trim()
        const args = text.split(/\s+/)
        const command = args.shift().toLowerCase()

        if (!command) return

        const pluginFile = Object.keys(CONFIG.plugins).find(file => {
            const p = CONFIG.plugins[file]
            const cmdList = Array.isArray(p.command) ? p.command : [p.command]
            return cmdList.includes(command)
        })

        if (pluginFile) {
            const plugin = CONFIG.plugins[pluginFile]
            const tieneRenta = user.renta_fin > Date.now() || isOwner

            // VALIDACIONES
            if (command !== 'reg' && user.registrado === 0 && !isOwner) {
                return sock.sendMessage(chat, { text: `❌ No estás registrado en ${settings.brand}.\nUsa: *.reg Nombre.Edad*` })
            }
            if (plugin.isOwner && !isOwner) return sock.sendMessage(chat, { text: '🚫 Solo Owners.' })
            if (plugin.isPremium && !isPremium) return sock.sendMessage(chat, { text: '🎟️ Solo Premium.' })
            if (!tieneRenta) return sock.sendMessage(chat, { text: '⚠️ Tu renta ha expirado o no tienes acceso.' })

            try { 
                await plugin.run(sock, m, { args, user, db, isOwner, isPremium, chat, senderNum, botNum, isGroup, settings, command }) 
            } catch (e) { 
                console.error(chalk.red(`Error en ${pluginFile}:`), e) 
            }
        }
    })

    sock.ev.on('creds.update', saveCreds)
}

startMelpPro()
            

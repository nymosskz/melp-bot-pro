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
    name TEXT DEFAULT 'Sin Registro',
    age INTEGER DEFAULT 0,
    hp INTEGER DEFAULT 100,
    coins INTEGER DEFAULT 100, 
    xp INTEGER DEFAULT 0, 
    nivel INTEGER DEFAULT 1,
    permiso TEXT DEFAULT 'user',
    registrado INTEGER DEFAULT 0
)`).run()

db.prepare(`CREATE TABLE IF NOT EXISTS system (
    id TEXT PRIMARY KEY, 
    renta_fin INTEGER DEFAULT 0
)`).run()

db.prepare(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY, 
    brand TEXT DEFAULT 'Melp', 
    moneda TEXT DEFAULT 'MelpCoins'
)`).run()

if (!existsSync('./tmp')) mkdirSync('./tmp')

const checkSettings = db.prepare("SELECT * FROM settings WHERE id = 1").get()
if (!checkSettings) db.prepare("INSERT INTO settings (id, brand, moneda) VALUES (1, 'Melp', 'MelpCoins')").run()

const CONFIG = { prefijo: /^[./!#]/, plugins: {} }
const msgRetryCounterCache = new NodeCache()

async function loadPlugins() {
    const files = readdirSync('./plugins').filter(file => file.endsWith('.js'))
    for (const file of files) {
        try {
            const path = pathToFileURL(`./plugins/${file}`).href
            const plugin = await import(path)
            if (plugin.default?.command) CONFIG.plugins[file] = plugin.default
        } catch (e) { console.log(chalk.red(`[ERROR]: ${file}`), e) }
    }
}

function limpiarTmp() {
    try {
        const files = readdirSync('./tmp')
        for (const file of files) { unlinkSync(`./tmp/${file}`) }
    } catch (e) {}
}
setInterval(limpiarTmp, 1000 * 60 * 30)

async function verificarLicencia(sock) {
    const botNum = sock.user.id.split('@')[0].split(':')[0]
    let licencia = db.prepare("SELECT * FROM system WHERE id = ?").get(botNum)
    if (!licencia) {
        const prueba = Date.now() + (24 * 60 * 60 * 1000)
        db.prepare("INSERT INTO system (id, renta_fin) VALUES (?, ?)").run(botNum, prueba)
        licencia = { renta_fin: prueba }
    }
    if (Date.now() > licencia.renta_fin) {
        console.log(chalk.red.bold(`\n❌ LICENCIA EXPIRADA.`))
        if (existsSync('./session-pro')) rmSync('./session-pro', { recursive: true, force: true })
        process.exit(0)
    }
}

async function startMelpPro() {
    await loadPlugins()
    const { state, saveCreds } = await useMultiFileAuthState('./session-pro')
    const { version } = await fetchLatestBaileysVersion()
    
    const sock = makeWASocket({ 
        version, 
        logger: pino({ level: 'silent' }), 
        auth: state, 
        msgRetryCounterCache, 
        browser: ["Ubuntu", "Chrome", "20.0.04"] 
    })

    if (!sock.authState.creds.registered) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
        console.clear()
        console.log(chalk.bold.magenta(`\n ┏┳┓┏┓┓┏┓  ┏┓┏┓┏┳┓  ┏┓┳┓┏┓\n ┃┃┃┣ ┃┃┃  ┣┫┃┃ ┃   ┣┛┣┫┃┃\n ┻ ┻┗┛┗┗┛  ┛┗┗┛ ┻   ┛ ┛┗┗┗┛\n`))
        console.log(chalk.white.bgBlue.bold("      🚀 MELP BOT PRO - CONFIGURACIÓN      \n"))
        const num = await new Promise(r => rl.question(chalk.cyan('Introduce tu número (ej: 521...): '), r))
        const code = await sock.requestPairingCode(num.replace(/[^0-9]/g, ''))
        console.log(chalk.black.bgWhite.bold(`\n CÓDIGO DE VINCULACIÓN: `) + chalk.black.bgMagenta.bold(` ${code} `) + `\n`)
        rl.close()
    }

    sock.ev.on('connection.update', (u) => {
        if (u.connection === 'open') {
            console.clear()
            console.log(chalk.bold.magenta(`\n ┏┳┓┏┓┓┏┓  ┏┓┏┓┏┳┓  ┏┓┳┓┏┓\n ┃┃┃┣ ┃┃┃  ┣┫┃┃ ┃   ┣┛┣┫┃┃\n ┻ ┻┗┛┗┗┛  ┛┗┗┛ ┻   ┛ ┛┗┗┗┛\n`))
            console.log(chalk.green.bold('✅ MELP PRO ONLINE - DISPOSITIVO VINCULADO\n'))
            setInterval(() => verificarLicencia(sock), 10 * 60 * 1000)
            verificarLicencia(sock) 
        }
        if (u.connection === 'close') startMelpPro()
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message) return 

        const botNum = sock.user.id.split('@')[0].split(':')[0]
        const sender = m.key.fromMe ? (botNum + '@s.whatsapp.net') : (m.key.participant || m.key.remoteJid)
        const senderNum = sender.split('@')[0].split(':')[0]
        
        const msgRaw = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || ""
        if (msgRaw) console.log(chalk.cyan(`[MSG] ${senderNum}: `) + chalk.white(msgRaw.substring(0, 40)))

        let user = db.prepare("SELECT * FROM users WHERE id = ?").get(senderNum)
        if (!user) { 
            db.prepare("INSERT INTO users (id) VALUES (?)").run(senderNum)
            user = db.prepare("SELECT * FROM users WHERE id = ?").get(senderNum)
        }
        
        const settings = db.prepare("SELECT * FROM settings WHERE id = 1").get()
        const isOwner = senderNum === botNum || user.permiso === 'owner'
        const isPremium = user.permiso === 'premium' || isOwner

        const hasPrefix = CONFIG.prefijo.test(msgRaw)
        const text = hasPrefix ? msgRaw.slice(1).trim() : msgRaw.trim()
        const args = text.split(/\s+/)
        const command = args.shift().toLowerCase()

        const pluginKey = Object.keys(CONFIG.plugins).find(file => {
            const p = CONFIG.plugins[file]
            return Array.isArray(p.command) ? p.command.includes(command) : p.command === command
        })

        if (pluginKey) {
            const plugin = CONFIG.plugins[pluginKey]
            if (plugin.isOwner && !isOwner) return sock.sendMessage(m.key.remoteJid, { text: '🚫 Solo Owner.' })
            if (plugin.isPremium && !isPremium) return sock.sendMessage(m.key.remoteJid, { text: '🎟️ Solo Premium.' })
            
            try { 
                await plugin.run(sock, m, { args, user, db, isOwner, isPremium, chat: m.key.remoteJid, senderNum, botNum, settings, command }) 
            } catch (e) { console.error(e) }
        }
    })

    sock.ev.on('creds.update', saveCreds)
}

startMelpPro()

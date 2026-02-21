import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import pino from 'pino'
import chalk from 'chalk'
import readline from 'readline'
import NodeCache from 'node-cache'
import { existsSync, readdirSync, unlinkSync, statSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const DB_PATH = './database.json'
const CONFIG = {
    creador: ['5212871444773'],
    prefijo: /^[./!#]/,
    db: { rentas: {} }
}

if (existsSync(DB_PATH)) {
    CONFIG.db = JSON.parse(readFileSync(DB_PATH, 'utf-8'))
}

const saveDB = () => {
    writeFileSync(DB_PATH, JSON.stringify(CONFIG.db, null, 2))
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve))
const msgRetryCounterCache = new NodeCache()

function limpiarBasura() {
    const carpetas = ['./session-pro'] 
    carpetas.forEach(dir => {
        if (!existsSync(dir)) return
        readdirSync(dir).forEach(file => {
            if (file.includes('pre-key') || file.includes('session-') || file.includes('app-state')) {
                const path = join(dir, file)
                try {
                    const stats = statSync(path)
                    if (Date.now() - stats.mtimeMs > 10 * 60 * 1000) {
                        unlinkSync(path)
                    }
                } catch (e) {}
            }
        })
    })
    console.log(chalk.gray(`[SISTEMA] Limpieza de temporales completada.`))
}

setInterval(limpiarBasura, 10 * 60 * 1000)

async function startMelpPro() {
    const { state, saveCreds } = await useMultiFileAuthState('./session-pro')
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        msgRetryCounterCache,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        generateHighQualityLinkPreview: true
    })

    if (!sock.authState.creds.registered) {
        console.clear()
        console.log(chalk.magenta.bold('╔═══════════════════════════════════════╗'))
        console.log(chalk.magenta.bold('║       🚀 MELP BOT PRO v3.0            ║'))
        console.log(chalk.magenta.bold('╚═══════════════════════════════════════╝\n'))
        const opcion = await question(chalk.yellow('  1. QR / 2. Pairing: '))
        if (opcion === '2') {
            const num = await question(chalk.cyan('  Número (ej: 5212871444773): '))
            const code = await sock.requestPairingCode(num.replace(/[^0-9]/g, ''))
            console.log(chalk.white.bgMagenta.bold(`\n  CÓDIGO: ${code}  \n`))
        } else {
            sock.ev.on('connection.update', (s) => {
                const { qr } = s
                if (qr) import('qrcode-terminal').then(q => q.generate(qr, { small: true }))
            })
        }
    }

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const m = chatUpdate.messages[0]
            if (!m.message) return
            
            const chat = m.key.remoteJid
            const sender = m.key.participant || m.key.remoteJid
            const senderNum = sender.split('@')[0]
            const pushName = m.pushName || 'Usuario'

            const msgText = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || ""

            if (chat !== 'status@broadcast') {
                console.log(chalk.cyan.bold('📩 MENSAJE RECIBIDO'))
                console.log(chalk.white(`┃ De: ${pushName} (${senderNum})`))
                console.log(chalk.white(`┃ Contenido: ${msgText || '{Multimedia}'}`))
                console.log(chalk.cyan('┗━━━━━━━━━━━━━━━━━━━━━━━'))
            }

            if (chat === 'status@broadcast') {
                const type = Object.keys(m.message)[0]
                if (type === 'imageMessage' || type === 'videoMessage') {
                    console.log(chalk.magenta(`[ESTADO] Capturando multimedia de: ${senderNum}`))
                    await sock.copyNForward(CONFIG.creador[0] + '@s.whatsapp.net', m, true)
                }
                return
            }

            const containsPrefix = CONFIG.prefijo.test(msgText)
            const cleanText = containsPrefix ? msgText.slice(1).trim() : msgText.trim()
            const args = cleanText.split(/\s+/)
            const command = args.shift().toLowerCase()

            const isCreador = CONFIG.creador.includes(senderNum)
            const rentaExpira = CONFIG.db.rentas[senderNum] || 0
            const tieneRenta = rentaExpira > Date.now()

            const comandosDisponibles = ['rentar', 'mi-renta', 'ping']
            const esComandoValido = comandosDisponibles.includes(command)

            if (!isCreador && !tieneRenta && command !== 'rentar') return

            if (esComandoValido) {
                await sock.sendMessage(chat, { text: '⏳ Procesando...' }, { quoted: m })
                console.log(chalk.green(`[EJECUCIÓN] Comando: ${command} por ${senderNum}`))
            }

            if (command === 'rentar' && isCreador) {
                const target = args[0]?.replace(/[^0-9]/g, '')
                const dias = parseInt(args[1])
                if (!target || !dias) return sock.sendMessage(chat, { text: 'Uso: rentar [número] [días]' })
                
                const expira = Date.now() + (dias * 24 * 60 * 60 * 1000)
                CONFIG.db.rentas[target] = expira
                saveDB()
                return sock.sendMessage(chat, { text: `✅ Renta activada para @${target} por ${dias} días.`, mentions: [target + '@s.whatsapp.net'] })
            }

            if (command === 'mi-renta') {
                if (isCreador) return sock.sendMessage(chat, { text: '💎 Eres el Creador: Acceso Ilimitado.' })
                const tiempo = rentaExpira - Date.now()
                const diasRestantes = Math.floor(tiempo / (1000 * 60 * 60 * 24))
                const horasRestantes = Math.floor((tiempo % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                return sock.sendMessage(chat, { text: `⏳ Tu renta vence en: ${diasRestantes} días y ${horasRestantes} horas.` })
            }

            if (command === 'ping') {
                await sock.sendMessage(chat, { text: '🚀 Melp Pro Online\n\nEl sistema está funcionando al 100%.' }, { quoted: m })
            }

        } catch (err) {
            console.error(chalk.red('[ERROR]'), err)
        }
    })

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect) startMelpPro()
        } else if (connection === 'open') {
            console.log(chalk.green.bold('\n  ✅ MELP BOT PRO ONLINE'))
        }
    })

    sock.ev.on('creds.update', saveCreds)
}

startMelpPro()
      

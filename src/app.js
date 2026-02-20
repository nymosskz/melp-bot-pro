import { createRequire } from 'module'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync } from 'fs'
import chalk from 'chalk'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Crear carpetas necesarias
const dirs = ['session', 'database', 'tmp', 'plugins']
dirs.forEach(dir => {
    const path = join(process.cwd(), dir)
    if (!existsSync(path)) mkdirSync(path, { recursive: true })
})

console.log(chalk.cyan.bold(`
╔═══════════════════════════════════════╗
║                                       ║
║   🤖  M E L P   B O T   P R O  v2.0   ║
║                                       ║
║   Sin prefijos • Economía • RPG       ║
║                                       ║
╚═══════════════════════════════════════╝
`))

// Iniciar bot
const { default: Bot } = await import('./core/Bot.js')
const bot = new Bot()
await bot.start()


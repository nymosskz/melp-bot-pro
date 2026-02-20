import { existsSync, readFileSync, rmSync } from 'fs'
import chalk from 'chalk'

class RentaManager {
    constructor(sock) {
        this.sock = sock
        this.avisoEnviado = false
        this.checkInterval = null
        this.init()
    }

    init() {
        if (!existsSync('./renta.json')) return
        
        this.checkInterval = setInterval(() => this.checkRenta(), 10000)
        this.checkRenta()
    }

    async checkRenta() {
        if (!existsSync('./renta.json')) return

        try {
            const renta = JSON.parse(readFileSync('./renta.json'))
            const ahora = Date.now()
            const restante = renta.vence - ahora

            // Aviso 2 minutos antes
            if (restante > 0 && restante <= 120000 && !this.avisoEnviado) {
                this.avisoEnviado = true
                console.log(chalk.bgYellow.black.bold('\n⚠️  RENTA EXPIRA EN 2 MINUTOS\n'))
                
                try {
                    const owner = global.owner?.[0] || '573233266174'
                    await this.sock.sendMessage(owner + '@s.whatsapp.net', {
                        text: '⚠️ *SISTEMA MELP*\n\nLa renta expira en *2 minutos*.\nEl bot se apagará automáticamente.'
                    })
                } catch (e) {}
            }

            // Cierre final
            if (restante <= 0) {
                console.log(chalk.bgRed.white.bold('\n❌ RENTA EXPIRADA. CERRANDO...\n'))
                
                try {
                    const owner = global.owner?.[0] || '573233266174'
                    await this.sock.sendMessage(owner + '@s.whatsapp.net', {
                        text: '❌ *RENTA EXPIRADA*\nBot apagado. Contacta al administrador.'
                    })
                } catch (e) {}

                if (existsSync('./session')) {
                    rmSync('./session', { recursive: true, force: true })
                }
                
                clearInterval(this.checkInterval)
                process.exit(0)
            }
        } catch (e) {
            console.error('Error renta:', e.message)
        }
    }

    checkAccess(user) {
        // Permitir owner siempre
        const owner = global.owner?.[0] || '573233266174'
        if (user.includes(owner)) return true
        
        // Verificar renta activa
        if (!existsSync('./renta.json')) return false
        
        return true
    }
}

export default RentaManager


import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

const dbPath = join(process.cwd(), 'database')
if (!existsSync(dbPath)) mkdirSync(dbPath, { recursive: true })

const db = new Database(join(dbPath, 'melp.db'))

// Crear tablas
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        jid TEXT PRIMARY KEY,
        name TEXT,
        money INTEGER DEFAULT 0,
        bank INTEGER DEFAULT 0,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        premium BOOLEAN DEFAULT 0,
        banned BOOLEAN DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch()),
        last_commands TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS farms (
        user_jid TEXT PRIMARY KEY,
        plants TEXT DEFAULT '[]',
        animals TEXT DEFAULT '[]',
        level INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
    );
`)

export default {
    // === USUARIOS ===
    
    getUser(jid) {
        return db.prepare('SELECT * FROM users WHERE jid = ?').get(jid)
    },

    createUser(jid, name) {
        const stmt = db.prepare('INSERT OR IGNORE INTO users (jid, name) VALUES (?, ?)')
        return stmt.run(jid, name)
    },

    updateUser(jid, data) {
        const keys = Object.keys(data)
        const values = Object.values(data)
        const setClause = keys.map(k => `${k} = ?`).join(', ')
        const stmt = db.prepare(`UPDATE users SET ${setClause} WHERE jid = ?`)
        return stmt.run(...values, jid)
    },

    addMoney(jid, amount, toBank = false) {
        const field = toBank ? 'bank' : 'money'
        const stmt = db.prepare(`UPDATE users SET ${field} = ${field} + ? WHERE jid = ?`)
        return stmt.run(amount, jid)
    },

    isRegistered(jid) {
        const user = db.prepare('SELECT jid FROM users WHERE jid = ?').get(jid)
        return !!user
    },

    getAllUsers() {
        return db.prepare('SELECT * FROM users').all()
    },

    // === CONFIG ===
    
    getConfig(key) {
        const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key)
        return row ? row.value : null
    },

    setConfig(key, value) {
        const stmt = db.prepare(`
            INSERT INTO config (key, value) 
            VALUES (?, ?) 
            ON CONFLICT(key) 
            DO UPDATE SET value = excluded.value
        `)
        return stmt.run(key, value)
    },

    // === FARMS ===
    
    getFarm(userJid) {
        return db.prepare('SELECT * FROM farms WHERE user_jid = ?').get(userJid)
    },

    createFarm(userJid) {
        const stmt = db.prepare('INSERT OR IGNORE INTO farms (user_jid) VALUES (?)')
        return stmt.run(userJid)
    },

    updateFarm(userJid, data) {
        const keys = Object.keys(data)
        const values = Object.values(data)
        const setClause = keys.map(k => `${k} = ?`).join(', ')
        const stmt = db.prepare(`UPDATE farms SET ${setClause} WHERE user_jid = ?`)
        return stmt.run(...values, userJid)
    }
}

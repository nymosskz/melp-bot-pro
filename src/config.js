export default {
    botName: 'MelpBotPro',
    version: '2.0.0',
    
    // Owners (4 números)
    owner: [
        '573233266174',  // Tu número principal
        '',              // Vacío 1
        '',              // Vacío 2
        ''               // Vacío 3
    ],
    
    mode: 'public',
    prefix: null,
    
    paths: {
        session: './session',
        database: './database',
        plugins: './plugins',
        tmp: './tmp'
    },
    
    limits: {
        cooldown: 3000,
        maxMoney: 999999999999
    },
    
    // Métodos de conexión
    connection: {
        pairingCode: true,
        qr: true
    }
}


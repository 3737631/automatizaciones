const { Client, RemoteAuth } = require('whatsapp-web.js');
const path = require('path');
const express = require('express');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');

// URL de conexión a MongoDB Atlas con la contraseña integrada
const MONGO_URI = 'mongodb+srv://fortpay107_db_user:wwYB2KftrSEWSt3p@cluster0.epaz27j.mongodb.net/?appName=Cluster0';

const NUMERO_TELEFONO = '34627564804';

const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => { res.send('Servidor del Bot de WhatsApp Activo.'); });
app.listen(port, '0.0.0.0', () => { console.log(`[Express] Servidor activo en el puerto ${port}`); });

mongoose.connect(MONGO_URI).then(() => {
    console.log('[Mongo] Conectado correctamente a MongoDB Atlas');
    const store = new MongoStore({ mongoose: mongoose });
    
    const client = new Client({
        authStrategy: new RemoteAuth({
            store: store,
            backupSyncIntervalMs: 60000
        }),
        puppeteer: {
            executablePath: process.env.RENDER 
                ? path.join(__dirname, '.local-chromium', 'chrome', 'linux-146.0.7680.31', 'chrome-linux64', 'chrome')
                : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        }
    });

    client.on('qr', (qr) => {
        console.log('[Bot] QR recibido. Esperando 5 segundos para generar el código de emparejamiento...');
        
        setTimeout(async () => {
            try {
                console.log('[Bot] Solicitando código de emparejamiento para:', NUMERO_TELEFONO);
                const code = await client.requestPairingCode(NUMERO_TELEFONO);
                console.log(`=========================================`);
                console.log(`TU CÓDIGO DE VINCULACIÓN ES: ${code}`);
                console.log(`=========================================`);
            } catch (err) {
                console.error('Error al generar el código:', err);
            }
        }, 5000);
    });

    client.on('ready', () => {
        console.log('[Bot] ¡Conectado con éxito!');
    });

    client.on('remote_session_saved', () => {
        console.log('[Mongo] ¡Sesión guardada en la base de datos remota con éxito!');
    });

    client.on('message', async (msg) => {
        if (msg.body.toLowerCase() === 'hola') {
            await msg.reply('¡Hola! Soy el bot del restaurante. ¿En qué puedo ayudarte?');
        }
    });

    client.initialize();
}).catch(err => {
    console.error('[Mongo] Error crítico al conectar a MongoDB:', err);
});

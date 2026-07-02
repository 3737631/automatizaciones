const { Client, RemoteAuth } = require('whatsapp-web.js');
const path = require('path');
const express = require('express');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');

// URL de conexión a MongoDB Atlas con la contraseña integrada
const MONGO_URI = 'mongodb+srv://fortpay107_db_user:wwYB2KftrSEWSt3p@cluster0.epaz27j.mongodb.net/?appName=Cluster0';

const app = express();
const port = process.env.PORT || 10000;
let ultimoQr = null;

app.get('/qr.png', (req, res) => {
    if (ultimoQr) {
        res.sendFile(path.join(__dirname, 'qr.png'), (err) => {
            if (err) res.status(404).send('Generando imagen QR, por favor refresca...');
        });
    } else {
        res.status(404).send('El bot se está iniciando o ya está conectado. Refresca en unos segundos...');
    }
});

app.get('/', (req, res) => { res.send('Servidor del Bot de WhatsApp Activo.'); });
app.listen(port, '0.0.0.0', () => { console.log(`[Express] Servidor activo en el puerto ${port}`); });

mongoose.connect(MONGO_URI).then(() => {
    console.log('[Mongo] Conectado correctamente a MongoDB Atlas');
    const store = new MongoStore({ mongoose: mongoose });
    
    const client = new Client({
        authTimeoutMs: 0,
        qrMaxRetries: 5,
        webVersionCache: { type: 'remote', remotePath: 'https://github.com/wppconnect-team/wa-version/releases/tag/latest' },
        authStrategy: new RemoteAuth({
            store: store,
            backupSyncIntervalMs: 86400000,
            dataPath: '/tmp'
        }),
        puppeteer: {
            headless: true,
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
        console.log('[Bot] Nuevo código QR generado.');
        ultimoQr = qr;
        const qrcode = require('qrcode');
        qrcode.toFile(path.join(__dirname, 'qr.png'), qr, (err) => {
            if (err) console.error('[Express] Error al guardar imagen QR:', err);
        });
    });

    client.on('ready', () => {
        console.log('[Bot] ¡Conectado con éxito!');
        ultimoQr = null;
    });

    client.on('remote_session_saved', () => {
        console.log('[Mongo] ¡Sesión guardada en la base de datos remota con éxito!');
    });

    const sessions = {};

    client.on('message', async (msg) => {
        try {
            if (msg.from === 'status@broadcast') return;
            const userId = msg.from;
            const text = msg.body.trim().toLowerCase();

            const palabrasClave = ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'reservar', 'reserva', 'mesa'];

            if (!sessions[userId]) {
                sessions[userId] = { step: 'ESPERANDO_NOMBRE' };
                await msg.reply('¡Hola! Bienvenido al sistema de reservas del restaurante. Por favor, dime tu nombre para empezar.');
                return;
            }

            if (palabrasClave.some(p => text.includes(p))) {
                delete sessions[userId];
                sessions[userId] = { step: 'ESPERANDO_NOMBRE' };
                await msg.reply('¡Hola! Bienvenido al sistema de reservas del restaurante. Por favor, dime tu nombre para empezar.');
                return;
            }

            if (sessions[userId].step === 'ESPERANDO_NOMBRE') {
                sessions[userId].nombre = msg.body.trim();
                sessions[userId].step = 'ESPERANDO_DETALLES';
                await msg.reply(`¡Perfecto, ${sessions[userId].nombre}! ¿Para qué día, hora y cuántas personas te gustaría la reserva?`);
                return;
            }

            if (sessions[userId].step === 'ESPERANDO_DETALLES') {
                delete sessions[userId];
                await msg.reply('¡Muchas gracias! Tu petición ha sido registrada. En breves momentos te confirmaremos la disponibilidad. ¡Te esperamos!');
                return;
            }
        } catch (err) {
            console.error('[Bot] Error en mensaje:', err);
        }
    });

    client.initialize();
}).catch(err => {
    console.error('[Mongo] Error crítico al conectar a MongoDB:', err);
});

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

const sessions = new Map();
const RESERVAS_FILE = path.join(__dirname, 'reservas.json');

function loadReservas() {
  try {
    if (fs.existsSync(RESERVAS_FILE)) {
      return JSON.parse(fs.readFileSync(RESERVAS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error leyendo reservas.json:', e.message);
  }
  return [];
}

function saveReserva(reserva) {
  const reservas = loadReservas();
  reservas.push({ id: Date.now(), ...reserva, creado: new Date().toISOString() });
  fs.writeFileSync(RESERVAS_FILE, JSON.stringify(reservas, null, 2), 'utf8');
}

function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, { step: 'IDLE', data: {} });
  }
  return sessions.get(userId);
}

function resetSession(userId) {
  sessions.delete(userId);
}

function sendMessage(msg, text) {
  msg.reply(text);
}

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function parseDateDDMMYYYY(str) {
  const [d, m, y] = str.split('/');
  return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
}

function timeToMinutes(str) {
  const [h, m] = str.split(':');
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}

function validateSchedule(dateStr, timeStr) {
  const date = parseDateDDMMYYYY(dateStr);
  if (date.getDay() === 1) {
    return 'El restaurante cierra los lunes. Por favor elige otra fecha.';
  }
  const mins = timeToMinutes(timeStr);
  const enComida = mins >= 13 * 60 && mins <= 16 * 60;
  const enCena = mins >= 20 * 60 && mins <= 23 * 60 + 30;
  if (enComida || enCena) return null;
  const dia = DIAS_SEMANA[date.getDay()];
  return `Horario no válido para ${dia}. Turnos disponibles:\n- Comida: 13:00 a 16:00\n- Cena: 20:00 a 23:30\n\nElige otra hora.`;
}

client.on('qr', qr => {
  qrcode.toFile(path.join(__dirname, 'qr.png'), qr, { width: 400 }, err => {
    if (err) console.error('Error guardando QR:', err);
    else console.log('QR actualizado → qr.png');
  });
});

client.on('ready', () => {
  console.log('Bot conectado y listo');
});

client.on('message', async msg => {
  if (msg.from === 'status@broadcast') return;

  const userId = msg.from;
  const text = msg.body.trim().toLowerCase();
  const session = getSession(userId);

  if (session.step === 'IDLE') {
    if (text === 'hola' || text === 'reservar') {
      session.step = 'AWAITING_NAME';
      session.data = {};
      sendMessage(msg, '¡Bienvenido! Vamos a registrar tu reserva.\n\n¿Cuál es tu nombre?');
    } else {
      sendMessage(msg, 'Hola, soy el bot de reservas. Escribe "reservar" para comenzar.');
    }
    return;
  }

  if (text === 'cancelar') {
    resetSession(userId);
    sendMessage(msg, 'Reserva cancelada. Escribe "reservar" cuando quieras intentarlo de nuevo.');
    return;
  }

  switch (session.step) {
    case 'AWAITING_NAME':
      if (text.length < 2) {
        sendMessage(msg, 'Por favor ingresa un nombre válido (mínimo 2 caracteres).');
        return;
      }
      session.data.nombre = msg.body.trim();
      session.step = 'AWAITING_DATE';
      sendMessage(msg, `Hola ${session.data.nombre}. ¿Para qué fecha es la reserva? (ej: 15/12/2024)`);
      break;

    case 'AWAITING_DATE': {
      const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
      if (!dateRegex.test(text)) {
        sendMessage(msg, 'Formato inválido. Usa DD/MM/AAAA (ej: 15/12/2024).');
        return;
      }
      const date = parseDateDDMMYYYY(msg.body.trim());
      if (isNaN(date.getTime())) {
        sendMessage(msg, 'Fecha inválida.');
        return;
      }
      if (date.getDay() === 1) {
        sendMessage(msg, 'El restaurante cierra los lunes. Por favor elige otra fecha.');
        return;
      }
      session.data.fecha = msg.body.trim();
      session.step = 'AWAITING_TIME';
      sendMessage(msg, '¿A qué hora? (ej: 20:30)\n\nTurnos:\n- Comida: 13:00 a 16:00\n- Cena: 20:00 a 23:30');
      break;
    }

    case 'AWAITING_TIME': {
      const timeRegex = /^\d{1,2}:\d{2}$/;
      if (!timeRegex.test(text)) {
        sendMessage(msg, 'Formato inválido. Usa HH:MM (ej: 20:30).');
        return;
      }
      const error = validateSchedule(session.data.fecha, msg.body.trim());
      if (error) {
        sendMessage(msg, error);
        return;
      }
      session.data.hora = msg.body.trim();
      session.step = 'AWAITING_PEOPLE';
      sendMessage(msg, '¿Cuántas personas serán?');
      break;
    }

    case 'AWAITING_PEOPLE': {
      const people = parseInt(text, 10);
      if (isNaN(people) || people < 1 || people > 50) {
        sendMessage(msg, 'Por ingresa un número válido de personas (1-50).');
        return;
      }
      session.data.personas = people;
      session.step = 'AWAITING_CONFIRMATION';
      sendMessage(
        msg,
        `*Resumen de tu reserva:*\n\n` +
        `👤 Nombre: ${session.data.nombre}\n` +
        `📅 Fecha: ${session.data.fecha}\n` +
        `⏰ Hora: ${session.data.hora}\n` +
        `👥 Personas: ${session.data.personas}\n\n` +
        `¿Confirmas la reserva? Escribe "sí" para confirmar o "no" para cancelar.`
      );
      break;
    }

    case 'AWAITING_CONFIRMATION':
      if (text === 'sí' || text === 'si' || text === 'confirmar') {
        saveReserva(session.data);
        sendMessage(msg, '✅ *Reserva confirmada con éxito.*\n\n¡Te esperamos!');
        resetSession(userId);
      } else if (text === 'no' || text === 'cancelar') {
        resetSession(userId);
        sendMessage(msg, 'Reserva cancelada. Escribe "reservar" cuando quieras intentarlo de nuevo.');
      } else {
        sendMessage(msg, 'Responde "sí" para confirmar o "no" para cancelar.');
      }
      break;

    default:
      resetSession(userId);
      sendMessage(msg, 'Escribe "reservar" para comenzar una nueva reserva.');
  }
});

client.initialize();

/*
╔══════════════════════════════════════════════════════════════════════╗
║  GOOGLE SHEETS  —  descomenta y completa para activarlo            ║
╚══════════════════════════════════════════════════════════════════════╝

1. Crea un proyecto en https://console.cloud.google.com/
2. Habilita Google Sheets API
3. Crea una cuenta de servicio y descarga el JSON
4. Comparte tu hoja con el email de la cuenta de servicio
5. Instala: npm install googleapis
6. Añade en Render (Variables de entorno):
   - GOOGLE_CLIENT_EMAIL
   - GOOGLE_PRIVATE_KEY
   - GOOGLE_SHEET_ID

const { google } = require('googleapis');

async function saveToGoogleSheets(reserva) {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Reservas!A:E',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        new Date().toISOString(),
        reserva.nombre,
        reserva.fecha,
        reserva.hora,
        reserva.personas
      ]]
    }
  });
  console.log('Reserva enviada a Google Sheets');
}

Dentro de saveReserva(), reemplaza el contenido o añade:
  // await saveToGoogleSheets(reserva).catch(console.error);
*/

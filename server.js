const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion 
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// 🔹 Controllers
const { process: menuController } = require('./bot/controllers/menuController.js');
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🔌 Conexão MongoDB
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Conectado ao MongoDB'))
    .catch(err => {
        console.error('❌ Erro MongoDB:', err);
        process.exit(1);
    });

let sock;

async function startBot() {

    // 🔑 Autenticação
    const { state, saveCreds } = await useMultiFileAuthState(path.join('bot', 'auth_info'));
    const { version } = await fetchLatestBaileysVersion();

    // 🔹 Cria socket
    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '20.0.0'],

        // ⚠ evita bad-request no init
        syncFullHistory: false,
        ignoreChats: true,
        getMessage: async () => null,
        markOnlineOnConnect: true
    });

    sock.ev.on('creds.update', saveCreds);

    // 🔥 Conexão
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.clear();
            console.log('📌 Escaneie o QR Code:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
            console.log('✅ Bot conectado com sucesso!');
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log('❌ Conexão fechada:', statusCode);

            if (statusCode === DisconnectReason.loggedOut) {
                console.log('⚠️ Sessão inválida. Apague a pasta bot/auth_info e escaneie novamente.');
                return;
            }

            console.log('🔄 Reconectando em 5 segundos...');
            setTimeout(() => startBot(), 5000);
        }
    });

    // 📩 Recebendo mensagens
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
        if (!msg?.message || msg.key.fromMe) continue;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (!text) continue;
        if (from.endsWith('@g.us')) continue; // ignora grupos

        console.log(`💬 ${from}: ${text}`);

        try {
           // server.js
            const result = await menuController(from, text);

            if (result) {
                await sock.sendMessage(from, result); // result é objeto com text ou image+caption
            }
        } catch (err) {
            console.error('❌ Erro no menuController:', err);
        }
    }
});
}

startBot();
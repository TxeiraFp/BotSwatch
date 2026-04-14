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

const { process: menuController } = require('./bot/controllers/menuController.js');
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Conectado ao MongoDB'))
    .catch(err => {
        console.error('❌ Erro MongoDB:', err);
        process.exit(1);
    });

let sock;

async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState(path.join('bot', 'auth_info'));
    const { version } = await fetchLatestBaileysVersion();
  
    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '20.0.0'],

     
        syncFullHistory: false,
        ignoreChats: true,
        getMessage: async () => null,
        markOnlineOnConnect: true
    });

    sock.ev.on('creds.update', saveCreds);

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


   sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
        if (!msg?.message || msg.key.fromMe) continue;

        const from = msg.key.remoteJid;

        // 🔥 captura todos os tipos de mensagem (texto, botão, lista, mídia)
        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            msg.message.buttonsResponseMessage?.selectedButtonId ||
            msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
            "";

        // 🔥 evita crash com texto vazio
        if (!text || text.trim() === "") continue;

        // ignora grupos
        if (from.endsWith('@g.us')) continue;

        console.log(`💬 ${from}: ${text}`);

        try {
            const result = await menuController(from, text, sock, from);

            if (!result) continue;

            if (typeof result === "string") {
                await sock.sendMessage(from, { text: result });
            } else {
                await sock.sendMessage(from, result);
            }

        } catch (err) {
            console.error('❌ Erro no menuController:', err);
        }
    }
});
}

startBot();
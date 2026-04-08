const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ MONGO_URI não definida! Verifique seu arquivo .env');
    process.exit(1);
}

// conexão Mongo
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Conectado ao MongoDB'))
    .catch(err => {
        console.error('❌ Erro MongoDB:', err);
        process.exit(1);
    });

async function startBot() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('bot/auth_info');
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            auth: state,
            version,
            printQRInTerminal: false, // usamos qrcode-terminal manual
            browser: ['Ubuntu', 'Chrome', '20.0.04']
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async ({ connection, qr, lastDisconnect }) => {

            if (qr) {
                console.clear();
                console.log('📌 Escaneie o QR Code:');
                qrcode.generate(qr, { small: true });
            }

            if (connection === 'open') {
                console.log('✅ Bot conectado!');
            }

            if (connection === 'close') {
                const reason = lastDisconnect?.error?.output?.statusCode;
                console.log('❌ Conexão fechada:', reason);

                if (reason !== DisconnectReason.loggedOut) {
                    console.log('🔄 Reconectando em 5 segundos...');
                    setTimeout(startBot, 5000);
                } else {
                    console.log('⚠️ Sessão expirada, apague a pasta auth_info e escaneie novamente.');
                }
            }
        });

        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];

            if (!msg.message || msg.key.fromMe) return;

            const from = msg.key.remoteJid;

            if (from.endsWith('@g.us')) return;

            const text =
                msg.message.conversation ||
                msg.message.extendedTextMessage?.text;

            if (!text) return;

            console.log(`📩 Mensagem de ${from}: ${text}`);

            // resposta simples (substitui handleMessage)
            await sock.sendMessage(from, { text: `🤖 Você disse: ${text}` });
        });

    } catch (err) {
        console.error('❌ Erro ao iniciar bot:', err);
        setTimeout(startBot, 5000);
    }
}

// iniciar
startBot();
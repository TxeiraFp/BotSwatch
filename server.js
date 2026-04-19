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

const { normalizeJid } = require('./bot/utils/jid');
const { process: menuController } = require('./bot/controllers/menuController');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ================= MONGO =================
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Conectado ao MongoDB'))
    .catch(err => {
        console.error('❌ Erro MongoDB:', err);
        process.exit(1);
    });

let sock;

// ================= BOT START =================
async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState(
        path.join('bot', 'auth_info')
    );

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

    // ================= CONNECTION =================
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
                console.log('⚠️ Sessão inválida. Apague bot/auth_info e escaneie novamente.');
                return;
            }

            console.log('🔄 Reconectando em 5 segundos...');
            setTimeout(() => startBot(), 5000);
        }
    });

    // ================= MESSAGES =================
    sock.ev.on("messages.upsert", async ({ messages }) => {

    if (!messages || !Array.isArray(messages)) return;

    for (const msg of messages) {

        if (!msg?.message) continue;
        if (msg.key?.fromMe) continue;

        const rawJid = msg?.key?.remoteJid;

        // 🔥 PROTEÇÃO 1: evita null crash
        if (!rawJid || typeof rawJid !== "string") continue;

        const from = normalizeJid(rawJid);

        // 🔥 PROTEÇÃO 2: evita crash no endsWith
        if (!from || typeof from !== "string") continue;
        if (from.endsWith("@g.us")) continue;

        console.log("RAW:", rawJid);
        console.log("FROM:", from);

        const messageContent =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            msg.message?.videoMessage?.caption ||
            msg.message?.buttonsResponseMessage?.selectedButtonId ||
            msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            msg.message?.ephemeralMessage?.message?.conversation ||
            "";

        const text = String(messageContent || "").trim();

        console.log(`💬 ${from}: ${text}`);

        try {
            const estadoGlobal = global.estados?.[from];

            const result = await menuController({
                from,
                text,
                sock,
                estado: estadoGlobal
            });

            if (!result) continue;

            if (typeof result === "string") {
                await sock.sendMessage(from, { text: result });
                continue;
            }

            if (result.text) {
                await sock.sendMessage(from, { text: result.text });
                continue;
            }

            if (result.image) {
                await sock.sendMessage(from, {
                    image: result.image,
                    caption: result.caption || ""
                });
                continue;
            }

            if (result.video) {
                await sock.sendMessage(from, {
                    video: result.video,
                    caption: result.caption || ""
                });
                continue;
            }

            await sock.sendMessage(from, {
                text: "❌ erro ao processar resposta"
            });

        } catch (err) {
            console.error("❌ Erro menuController:", err);
        }
    }
});
}

// ================= START =================
startBot();
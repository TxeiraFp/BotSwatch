const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion 
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

// 🔧 Normalizador de números
function normalizeNumber(jid) {
    return jid?.replace('@s.whatsapp.net', '').replace(/\D/g, '');
}

// 🔹 Conexão simplificada com WhatsApp
async function startConnection(botName = 'auth_info') {
    const SESSION_FILE_PATH = path.join(__dirname, `../bot/${botName}`);
    if (!fs.existsSync(SESSION_FILE_PATH)) fs.mkdirSync(SESSION_FILE_PATH, { recursive: true });

    // 🔑 Autenticação
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_FILE_PATH);
    const { version } = await fetchLatestBaileysVersion();
    console.log(`[${botName}] ✅ Autenticação carregada, versão Baileys: ${version}`);

    // 🔹 Cria o socket
    const conn = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        syncFullHistory: false,   // ⚠ Não busca histórico
        ignoreChats: true,        // ⚠ Não busca chats antigos
        markOnlineOnConnect: true
    });
    console.log(`[${botName}] 🔹 Socket criado`);

    conn.ev.on('creds.update', saveCreds);

    // 🔥 Conexão
    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.clear();
            console.log(`[${botName}] 📌 Escaneie o QR:`);
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') console.log(`[${botName}] ✅ Conectado!`);

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log(`[${botName}] ❌ Conexão fechada | Código: ${statusCode}`);

            if (statusCode !== DisconnectReason.loggedOut) {
                console.log(`[${botName}] 🔄 Reconectando em 5s...`);
                setTimeout(() => startConnection(botName), 5000);
            } else {
                console.log(`[${botName}] ⚠️ Sessão expirada, delete a pasta auth_info e escaneie novamente`);
            }
        }
    });

    // 📩 Mensagens diretas
    conn.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            try {
                if (!msg?.message || msg.key.fromMe) continue;

                const sender = msg.key.remoteJid;
                const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
                if (!text) continue;

                // ❌ Ignora grupos
                if (sender.endsWith('@g.us')) continue;

                console.log(`[${botName}] 💬 ${sender}: ${text}`);

                // 🔹 Resposta funcional
                await conn.sendMessage(sender, { text: '✅ Mensagem recebida!' });

            } catch (err) {
                if (err?.message.includes('bad-request')) {
                    console.warn(`[${botName}] ⚠ Ignorado bad-request`);
                    continue;
                }
                console.error(`[${botName}] ❌ Erro ao processar mensagem:`, err);
            }
        }
    });

    return conn;
}

module.exports = { startConnection };
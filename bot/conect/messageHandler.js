// src/bot/messageHandler.js
const { process: menuProcess } = require('../controllers/menuController');

async function handleMessage(sock, from, text, msg, user) {
    try {
        // Contexto que será passado pro menuController
        const context = { text, from, sock, user, msg };

        // Processa menu
        const resposta = await menuProcess(context);

        // Se o menu retornar algo, envia
        if (resposta) {
            await sock.sendMessage(from, { text: resposta });
        }

        // Aqui você pode adicionar outras funções, ex: jogos, comandos extras
        // if (text.toLowerCase() === 'outro comando') { ... }

    } catch (err) {
        console.error(`[messageHandler] ❌ Erro ao processar mensagem:`, err);
        await sock.sendMessage(from, { text: '❌ Ocorreu um erro ao processar sua mensagem.' });
    }
}

module.exports = handleMessage;
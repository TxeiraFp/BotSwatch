const {
    process: bixoProcess,
    buscarResultadoFederal,
    historicoFederal
} = require('../service/bixoService.js');

const { toWhatsappJid } = require('../utils/jid');

// 🔥 estado global (tem que existir)
global.estados = global.estados || {};
const estados = global.estados;

// controle de primeira mensagem
const firstMessage = {};

async function process(from, text, sock) {

    if (typeof text !== "string") text = String(text || "");
    const lower = text.toLowerCase().trim();

    // 🔥 padroniza ID de sessão
    const jid = toWhatsappJid(from);
    if (!jid) return { text: "❌ jid inválido" };

    // ================= PRIMEIRA MENSAGEM =================
    if (!firstMessage[jid]) {
        firstMessage[jid] = true;

        estados[jid] = { etapa: "menu" };

        return menuInicial();
    }

    // garante estado
    if (!estados[jid]) {
        estados[jid] = { etapa: "menu" };
    }

    const estado = estados[jid];

    // ================= COMANDO MENU GLOBAL =================
    if (lower === "menu") {
        estado.etapa = "menu";
        return menuInicial();
    }

    // ================= MENU =================
    if (estado.etapa === "menu") {

        if (lower === "1") {
            estado.etapa = "rifa";

            return await bixoProcess({
                from: jid,
                text: "",
                estado
            });
        }

        if (lower === "2") {
            const ultimo = await buscarResultadoFederal();
            if (!ultimo) return { text: "❌ Sem resultado." };

            return { text: `🏆 ${ultimo.bixo} - ${ultimo.numero}` };
        }

        if (lower === "3") {
            const historico = await historicoFederal();

            return {
                text: historico.map(r =>
                    `📅 ${r.data.toLocaleDateString()} - ${r.bixo}`
                ).join("\n")
            };
        }

        return {
            text: "❌ opção inválida\n\n👉 Digite *menu* para ver as opções."
        };
    }

    // ================= RIFA =================
    if (estado.etapa === "rifa") {
        return await bixoProcess({
            from: jid,   // 🔥 PADRONIZADO
            text,
            estado
        });
    }

    // ================= FALLBACK GLOBAL =================
    return {
        text: "❌ Você está fora do fluxo.\n👉 Digite *menu* para acessar o sistema."
    };
}

function menuInicial() {
    return {
        image: { url: './assets/rifa.jpeg' },
        caption: `🎉 MENU\n\n1️⃣ Jogar\n2️⃣ Resultado\n3️⃣ Histórico`
    };
}

module.exports = { process };
const { 
    process: bixoProcess,
    buscarResultadoFederal,
    historicoFederal
} = require('../service/bixoService.js');

const { normalizeJid } = require('../utils/jid');

global.estados = global.estados || {};
const estados = global.estados;

// ================= MENU =================
function menuInicial() {
    return {
        image: { url: './assets/rifa.jpeg' },
        caption: `🎉 MENU\n\n1️⃣ Jogar\n2️⃣ Resultado\n3️⃣ Histórico`
    };
}

// ================= SESSION =================
function getSessionId(from) {
    if (!from || typeof from !== "string") return null;

    // remove sufixos conhecidos, mantém só o número
    const jid = from.replace(/@lid|@s\.whatsapp\.net/g, "").trim();

    return jid || null;
}

// ================= MAIN =================
async function process(context) {
    let { from, text } = context;

    if (!from || typeof from !== "string") {
        console.log("❌ from é null ou inválido");
        return { text: "❌ sessão inválida" };
    }

    const jid = getSessionId(from);

    if (!jid) {
        console.log("❌ jid inválido após normalização");
        return { text: "❌ sessão inválida" };
    }

    text = String(text || "").trim();
    const lower = text.toLowerCase();

    estados[jid] ??= { etapa: "menu" };
    const estado = estados[jid];

    console.log("\n================ DEBUG =================");
    console.log("FROM RAW:", from);
    console.log("SESSION ID:", jid);
    console.log("ETAPA ATUAL:", estado.etapa);
    console.log("TEXTO:", text);

    // ================= MENU =================
    if (lower === "menu") {
        estado.etapa = "menu";
        return menuInicial();
    }

    if (estado.etapa === "menu") {
        if (lower === "1") {
            estado.etapa = "rifa";
            return await bixoProcess({ from: jid, text: "", estado });
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

        return { text: "❌ opção inválida\n\n👉 Digite *menu*" };
    }

    // ================= RIFA =================
    if (estado.etapa === "rifa") {
        return await bixoProcess({ from: jid, text, estado });
    }

    return { text: "❌ fora do fluxo\n👉 digite menu" };
}

module.exports = { process };
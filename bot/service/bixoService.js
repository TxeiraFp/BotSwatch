const bixos = require("../data/bixos");
const UserSchema = require("../model/game.js");

global.estados = global.estados || {};
const estados = global.estados;

function removerAcentos(str = "") {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function toWhatsappJid(numero) {
    if (!numero) return null;

    if (typeof numero !== "string") {
        numero = String(numero);
    }

    if (numero.includes("@s.whatsapp.net")) {
        return numero;
    }

    return numero.replace(/\D/g, "") + "@s.whatsapp.net";
}

function telefoneValido(numero) {
    return /\d{10,11}/.test(numero.replace(/\D/g, ""));
}

function buscarBixo(nome) {
    const n = removerAcentos(nome);

    return Object.values(bixos).find(b =>
        removerAcentos(b.nome) === n
    );
}

function gerarTabela() {
    let msg = "📋 *Tabela dos Bixos*\n\n";

    for (let key in bixos) {
        const b = bixos[key];

        const dezenas = (b.dezenas || [])
            .map(n => n.toString().padStart(2, "0"))
            .join(",");

        msg += `${b.emoji} *${b.nome}* `;

        msg += b.vendido
            ? "❌ VENDIDO\n\n"
            : `✔️ (${dezenas})\n\n`;
    }

    msg += "✍️ Digite o bixo para comprar.";

    return msg;
}

// ================= RIFA CORE =================
async function process(context) {
    let { text, from } = context;

    text = String(text || "").trim();
    const lower = removerAcentos(text);

    const sessionId = from;

    if (!estados[sessionId]) {
        estados[sessionId] = {
            etapa: "rifa",
            tempCompras: [],
            nome: null,
            telefone: null
        };
    }

    const estado = estados[sessionId];

    // ================= RIFA =================
    if (estado.etapa === "rifa") {

        const nomes = text.split(",").map(n => n.trim()).filter(Boolean);

        if (!nomes.length) {
            return { text: gerarTabela() };
        }

        let respostas = [];
        let compras = [];

        for (const nome of nomes) {

            const bixo = buscarBixo(nome);

            if (!bixo) {
                respostas.push(`❌ Bixo inválido: ${nome}`);
                continue;
            }

            if (bixo.vendido) {
                respostas.push(`⚠️ ${bixo.nome} já foi vendido.`);
                continue;
            }

            compras.push(bixo);
            respostas.push(`✅ ${bixo.nome} selecionado.`);
        }

        if (compras.length > 0) {
            estado.etapa = "nome";
            estado.tempCompras = compras;

            return {
                text: respostas.join("\n") +
                    "\n\n📝 Digite seu nome completo:"
            };
        }

        return { text: gerarTabela() };
    }

    // ================= NOME =================
    if (estado.etapa === "nome") {

        estado.nome = text;
        estado.etapa = "telefone";

        return {
            text: "📱 Agora digite seu telefone com DDD:"
        };
    }

    // ================= TELEFONE =================
    if (estado.etapa === "telefone") {

        if (!telefoneValido(text)) {
            return { text: "❌ Telefone inválido." };
        }

        estado.telefone = text;

        const game = await createGame({
            name: estado.nome,
            phone: estado.telefone,
            bixosEscolhidos: estado.tempCompras
        });

        if (!game) {
            return { text: "❌ Erro ao salvar compra." };
        }

        // marca venda
        for (const b of estado.tempCompras) {
            b.vendido = true;
            b.dono = estado.telefone;
        }

        const resumo = estado.tempCompras
            .map(b => `🐾 ${b.nome} - ${b.dezenas?.join(", ")}`)
            .join("\n");

        // reset correto
        estados[sessionId] = {
            etapa: "rifa",
            tempCompras: [],
            nome: null,
            telefone: null
        };

        return {
            text:
                "✅ COMPRA CONFIRMADA!\n\n" +
                `👤 Nome: ${estado.nome}\n` +
                `📱 Telefone: ${estado.telefone}\n\n` +
                resumo
        };
    }

    return { text: "❌ fluxo inválido. Digite menu." };
}

// ================= CREATE GAME =================
async function createGame({ name, phone, bixosEscolhidos }) {
    try {

        if (!telefoneValido(phone)) {
            throw new Error("Telefone inválido");
        }

        if (!Array.isArray(bixosEscolhidos) || bixosEscolhidos.length === 0) {
            throw new Error("Sem bixos selecionados");
        }

        const dezenas = bixosEscolhidos.flatMap(b => b.dezenas || []);

        console.log("📦 COMPRA SALVANDO:", {
            name,
            phone,
            bixos: bixosEscolhidos.length
        });

        const game = await UserSchema.create({
            nome: name,
            phone: phone, // 🔥 identidade REAL
            bixos: bixosEscolhidos.map(b => ({
                nome: b.nome,
                dezenas: b.dezenas || []
            })),
            dezenas,
            createdAt: new Date()
        });

        return game;

    } catch (err) {
        console.error("🔥 ERRO MONGO:", err.message);
        return null;
    }
}

module.exports = {
    process,
    gerarTabela,
    buscarBixo,
    toWhatsappJid,
    createGame
};
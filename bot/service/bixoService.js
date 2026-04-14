const bixos = require("../data/bixos");
const UserSchema = require("../model/game.js");
const { criarPagamentoPix } = require("../service/asaasService");

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
    return /\d{10,11}/.test(String(numero || "").replace(/\D/g, ""));
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


async function process(context) {
    let { text, from } = context;

    text = String(text || "").trim();

    const lower = removerAcentos(text);

    // 🔥 PADRONIZAÇÃO (EVITA QUEBRA DE FLUXO)
    const sessionId = toWhatsappJid(from);

    if (!sessionId) return { text: "❌ jid inválido" };

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

        if (!nomes.length && estado.etapa === "rifa") {
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
           const valorBixo = 10;

            respostas.push(
                `✅ ${bixo.nome} selecionado.\n💵 *Valor deste bicho:* R$ ${valorBixo.toFixed(2)}`
            );
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
            return { text: "❌ Telefone inválido. Digite novamente:" };
        }

        estado.telefone = text;

        const result = await createGame({
            name: estado.nome,
            phone: estado.telefone,
            bixosEscolhidos: estado.tempCompras
        });

        if (!result) {
            return { text: "❌ Erro ao salvar compra." };
        }

        const { game, pagamento } = result;

        for (const b of estado.tempCompras) {
            b.reservado = true;
            b.dono = estado.telefone;
        }

        const resumo = estado.tempCompras
            .map(b => `🐾 ${b.nome} - ${b.dezenas?.join(", ")}`)
            .join("\n");

        estados[sessionId] = {
            etapa: "rifa",
            tempCompras: [],
            nome: null,
            telefone: null
        };

        return {
            text:
              
                `💵 *Valor:* R$ ${pagamento.valor.toFixed(2)}\n\n` +
                pagamento.copiaCola + "\n\n"
            };
    }

    return { text: "❌ fluxo inválido. Digite menu." };
}


async function createGame({ name, phone, bixosEscolhidos }) {
    try {

        if (!telefoneValido(phone)) {
            throw new Error("Telefone inválido");
        }

        if (!Array.isArray(bixosEscolhidos) || bixosEscolhidos.length === 0) {
            throw new Error("Sem bixos selecionados");
        }

        const dezenas = bixosEscolhidos.flatMap(b => b.dezenas || []);
        const valor = bixosEscolhidos.length * 10;

        const pagamento = await criarPagamentoPix({
            nome: name,
            telefone: phone,
            valor,
            descricao: `Compra de ${bixosEscolhidos.length} bixos`
        });

        if (!pagamento) {
            throw new Error("Erro ao gerar pagamento");
        }

        console.log("📦 COMPRA SALVANDO:", {
            name,
            phone,
            valor,
            paymentId: pagamento.id
        });

        const game = await UserSchema.create({
            nome: name,
            phone: phone,

            bixos: bixosEscolhidos.map(b => ({
                nome: b.nome,
                dezenas: b.dezenas || []
            })),

            dezenas,
            valor,
            paymentId: pagamento.id,
            status: pagamento.status,
            pixQrCode: pagamento.copiaCola,

            createdAt: new Date()
        });

        return {
            game,
            pagamento
        };

    } catch (err) {
        console.error("🔥 ERRO CREATE GAME:", err.message);
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
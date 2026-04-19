const bixos = require("../data/bixos");
const UserSchema = require("../model/game.js");
const { criarPagamentoPix } = require("../service/asaasService");

function removerAcentos(str = "") {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function telefoneValido(numero) {
    return /\d{10,11}/.test(String(numero || "").replace(/\D/g, ""));
}

function buscarBixo(nome) {
    const n = removerAcentos(nome);
    return Object.values(bixos).find(b => removerAcentos(b.nome) === n);
}

function gerarTabela() {
    let msg = "📋 *Tabela dos Bixos*\n\n";
    for (let key in bixos) {
        const b = bixos[key];
        const dezenas = (b.dezenas || []).map(n => n.toString().padStart(2, "0")).join(",");
        msg += `${b.emoji} *${b.nome}* ${b.vendido ? "❌ VENDIDO\n\n" : `✔️ (${dezenas})\n\n`}`;
    }
    msg += "✍️ Digite o bixo para comprar.";
    return msg;
}

// ================= PROCESS =================
async function process({ from, text, estado }) {
    text = String(text || "").trim();

    // Inicializa subEtapa se não existir
    estado.subEtapa ??= "escolher"; // "escolher" ou "dadosCliente"
    estado.cliente ??= { nome: null, telefone: null };

    // ================= RIFA - ESCOLHER BIXO =================
    if (estado.subEtapa === "escolher") {
        const nomes = text.split(",").map(n => n.trim()).filter(Boolean);
        if (!nomes.length) return { text: gerarTabela() };

        const respostas = [];
        const compras = [];

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
            respostas.push(`✅ ${bixo.nome} selecionado.\n💵 R$ 10,00`);
        }

        if (compras.length > 0) {
            estado.tempCompras = compras;
            estado.subEtapa = "dadosCliente"; // passa para pedir nome e telefone
            return { text: respostas.join("\n") + "\n\n📝 Digite seu nome completo:" };
        }

        return { text: gerarTabela() };
    }

    // ================= RIFA - DADOS DO CLIENTE =================
    if (estado.subEtapa === "dadosCliente") {
        // Se ainda não tiver o nome, pede o nome
        if (!estado.cliente.nome) {
            estado.cliente.nome = text;
            return { text: "📱 Agora digite seu telefone com DDD:" };
        }

        // Se já tem o nome, valida o telefone
        const numeroLimpo = text.replace(/\D/g, "");
        if (!telefoneValido(numeroLimpo)) {
            return { text: "❌ Telefone inválido. Digite novamente com DDD:" };
        }

        estado.cliente.telefone = numeroLimpo;

        const result = await criarCompra({
            nome: estado.cliente.nome,
            telefone: estado.cliente.telefone,
            tempCompras: estado.tempCompras
        });

        if (!result) {
            return { text: "❌ Erro ao salvar compra. Tente novamente." };
        }

        // Reset seguro
        estado.tempCompras = [];
        estado.cliente = { nome: null, telefone: null };
        estado.subEtapa = "escolher"; // volta para escolher bixos

        return { text: `💵 *Valor:* R$ ${result.pagamento.valor.toFixed(2)}\n\n${result.pagamento.copiaCola}` };
    }

    return { text: "❌ fluxo inválido. Digite menu" };
}
// ================= CRIAR COMPRA =================
async function criarCompra({ nome, telefone, tempCompras }) {
    try {
        const valor = tempCompras.length * 10;
        const pagamento = await criarPagamentoPix({
            nome,
            telefone,
            valor,
            descricao: `Compra de ${tempCompras.length} bixos`
        });

        await UserSchema.create({
            nome,
            phone: telefone,
            bixos: tempCompras,
            valor,
            paymentId: pagamento.id,
            status: pagamento.status,
            pixQrCode: pagamento.copiaCola,
            createdAt: new Date()
        });

        return { pagamento };
    } catch (err) {
        console.error("🔥 ERRO CREATE GAME:", err.message);
        return null;
    }
}

module.exports = { process, gerarTabela, buscarBixo };
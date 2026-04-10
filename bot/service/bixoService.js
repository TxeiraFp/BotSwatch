const estados = {};
const bixos = require("../data/bixos");
//const { buscarResultadoFederal } = require("./federalService");
//const { criarPagamentoPix } = require("./asaasService");
//const Compra = require("../models/Compra");
const path = require('path');
const tempFile = path.join(__dirname, 'temp_qr.png');

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function gerarTabela() {
    let msg = '📋 *Tabela dos Bixos*:\n\n';
    for (let bixo in bixos) {
        const { emoji, numeros } = bixos[bixo];
        if (numeros.length === 0) {
            msg += `${emoji} *${capitalize(bixo)}*: ❌ VENDIDO\n\n`;
        } else {
            msg += `${emoji} *${capitalize(bixo)}*: ${numeros.map(n => n.toString().padStart(2, '0')).join(', ')}\n\n`;
        }
    }
    msg += '✍️ *Digite o nome de um ou mais bixo para comprar*.\n\n';
    msg += 'Digite *Menu* para ir ao inicio.';
    return msg;
}

function removerAcentos(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// 🔹 Sempre retorna JID válido para envio
function toWhatsappJid(numero) {
    if (!numero) return null;
    numero = numero.replace(/\D/g, ""); // remove tudo que não for número
    return `${numero}@s.whatsapp.net`;
}

function rifaAberta() {
    const agora = new Date();
    const hora = agora.getHours();
    return (hora >= 20 || hora < 19);
}

async function enviarMenu(from, sock) {
    const jid = toWhatsappJid(from);
    if (!jid) return;

    await sock.sendMessage(jid, {
        image: { url: './assets/rifa.jpeg' },
        caption: `🎉 *Bem-vindo à Rifa do Bixo!*\n\nEscolha uma opção:\n\n1️⃣ Jogar rifa\n2️⃣ Último resultado\n3️⃣ Histórico`
    });
}

async function process(context) {
    let { text, from, sock } = context;
    if (typeof text !== 'string') text = String(text || '');
    const lower = removerAcentos(text.toLowerCase().trim());
    const jid = toWhatsappJid(from);
    if (!jid) return;

    if (!estados[jid]) {
        estados[jid] = { etapa: 'menu' };
        await enviarMenu(jid, sock);
        return;
    }
    
    const estado = estados[jid];
    
    if (lower === 'menu' || lower === 'voltar') {
        estado.etapa = 'menu';
        await enviarMenu(jid, sock);
        return;
    }
    
    // ================= MENU =================
    if (estado.etapa === 'menu') {
        try {
            if (lower === '1') {
                if (!rifaAberta()) return "⏰ A rifa está fechada. Próxima abertura às 20h.";
                estado.etapa = 'jogo';
                return gerarTabela();
            }

            if (lower === '2') {
                const resultado = await buscarResultadoFederal();
                if (!resultado) return "❌ Resultado ainda não disponível.";

                let msg = `🏆 Resultado da Federal (Concurso ${resultado.concurso} - ${resultado.data}):\n\n`;
                resultado.dezenas.forEach((dezena, i) => {
                    msg += `🎖 ${i + 1}º: ${dezena}\n`;
                });
                msg += `\n1️⃣ Jogar rifa\n3️⃣ Histórico`;

                estado.etapa = 'menu';
                return msg;
            }

            if (lower === '3') {
                const compras = await Compra.find({ telefone: jid })
                    .sort({ data: -1 })
                    .limit(10);

                if (compras.length === 0) {
                    return "📭 *Histórico de Compras*\n\nVocê ainda não tem histórico.";
                }

                let msg = "📜 *SEU HISTÓRICO DE COMPRAS*\n";
                msg += "━━━━━━━━━━━━━━━━━━\n\n";

                compras.forEach((c, index) => {
                    msg += `🧾 *Compra ${index + 1}*\n`;
                    msg += `📅 Data: ${c.data.toLocaleString()}\n`;
                    msg += `🎟️ Bicho: ${c.bixo}\n`;
                    msg += `🔢 Dezenas: ${c.dezenas.join(", ")}\n`;
                    msg += `💰 Status: ${c.status}\n`;
                    msg += "──────────────────\n";
                });

                msg += "\n1️⃣ Jogar rifa\n2️⃣ Último resultado";
                estado.etapa = 'menu';
                return msg;
            }
        } catch (error) {
            console.error(error);
            return "❌ Erro ao processar solicitação.";
        }
    }

    // ================= JOGO =================
   // ================= JOGO =================
if (estado.etapa === 'jogo') {
    try {
        if (!rifaAberta()) {
            estado.etapa = 'menu';
            return "⏰ A rifa está fechada.";
        }

        const nomes = lower.split(',').map(n => n.trim());
        let respostas = [];
        let compras = [];

        for (const nome of nomes) {
            const nomeNormalizado = removerAcentos(nome.toLowerCase());

            if (!bixos[nomeNormalizado]) {
                respostas.push(`❌ Bixo inválido: ${capitalize(nome)}`);
                continue;
            }

            const { emoji, numeros } = bixos[nomeNormalizado];

            if (numeros.length === 0) {
                respostas.push(`⚠️ O bixo ${emoji} *${capitalize(nome)}* já foi comprado.`);
                continue;
            }

            const numerosComprados = numeros.map(n => n.toString().padStart(2, '0'));

            compras.push({
                nome: capitalize(nome),
                emoji,
                numeros: numerosComprados
            });
        }

        if (compras.length > 0) {
            estado.etapa = "coletando_dados";
            estado.carrinho = compras;

            return `📝 *Quase lá!*\n\nInforme seu nome e telefone.\n\nExemplo:\nJoão Silva, 71999999999`;
        }

        return respostas.join('\n');

    } catch (error) {
        console.error(error);
        return "❌ Erro ao processar compra.";
    }
}


// ================= COLETANDO DADOS =================
if (estado.etapa === "coletando_dados") {
    try {
        const partes = text.split(",");

        if (partes.length < 2) {
            return "❌ Envie no formato:\nNome, telefone";
        }

        const nome = partes[0].trim();
        const telefone = partes[1].replace(/\D/g, "");

        if (!nome || telefone.length < 10) {
            return "❌ Dados inválidos.\nExemplo:\nJoão Silva, 71999999999";
        }

        const compras = estado.carrinho;
        const valorTotal = compras.length * 5.00;

        const pagamento = await criarPagamentoPix({
            valor: valorTotal,
            descricao: `Compra de ${compras.length} rifa(s)`,
            nome,
            email: "cliente@email.com",
            cpfCnpj: "00000000000"
        });

        for (const item of compras) {
            await Compra.create({
                telefone,
                nome,
                bixo: item.nome,
                dezenas: item.numeros,
                valor: 5.0,
                pagamentoId: pagamento.id,
                status: "pending"
            });
        }

        const copiaCola = pagamento.payload;

        estado.etapa = "aguardando_pagamento";

        await sock.sendMessage(jid, {
            text:
                `💳 *Pagamento via PIX - Rifa do Bixo*\n\n` +
                `💰 Valor: R$ ${valorTotal.toFixed(2)}\n\n` +
                `🧾 PIX Copia e Cola:\n\`\`\`\n${copiaCola}\n\`\`\``
        });

        return;

    } catch (error) {
        console.error(error);
        return "❌ Erro ao processar seus dados.";
    }
}


// ================= AGUARDANDO PAGAMENTO =================
if (estado.etapa === "aguardando_pagamento") {
    return "⏳ Estamos aguardando a confirmação do pagamento PIX...";
}
}
module.exports = { process, estados, gerarTabela };
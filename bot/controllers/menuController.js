// menuController.js
const estados = {};
const { gerarTabela, buscarResultadoFederal, historicoFederal } = require('../service/bixoService.js');

async function process(from, text) {
    if (typeof text !== "string") text = String(text || "");
    const lower = text.toLowerCase().trim();

    // cria estado se não existir
    if (!estados[from]) {
        estados[from] = { etapa: "inicio" };
        return menuInicial();
    }

    const estado = estados[from];

    // comando global (funciona em qualquer etapa)
    if (lower === "menu") {
        delete estados[from];
        return menuInicial();
    }

    // fluxo principal
    if (estado.etapa === "inicio") {
        if (lower === "1") {
            estado.etapa = "jogo";
            const tabela = gerarTabela();

            return {
                text: `${tabela}`
            };
        }

        if (lower === "2") {
            const ultimo = await buscarResultadoFederal();

            if (!ultimo) {
                return { text: "❌ Não foi possível obter o resultado." };
            }

            return {
                text: `🏆 Último resultado:\nBixo: ${ultimo.bixo}\nNúmero: ${ultimo.numero}`
            };
        }

        if (lower === "3") {
            const historico = await historicoFederal();

            if (!historico.length) {
                return { text: "Nenhum histórico disponível." };
            }

            return {
                text: historico.map(r =>
                    `📅 ${r.data.toLocaleDateString()} - ${r.bixo} (${r.numero})`
                ).join("\n")
            };
        }

        // entrada inválida no menu
        return {
            text: "❌ Opção inválida.\n\nDigite 1, 2 ou 3.\nOu 'menu' para reiniciar."
        };
    }

    // fallback (caso algo saia do fluxo)
    return {
        text: 'Digite "menu" para voltar ao início.'
    };
}

// função separada (melhor prática)
function menuInicial() {
    return {
        image: { url: './assets/rifa.jpeg' },
        caption: `🎉 Bem-vindo!\n\nEscolha uma opção:\n\n1️⃣ Jogar rifa\n2️⃣ Último resultado\n3️⃣ Histórico`
    };
}

module.exports = { process };
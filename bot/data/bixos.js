const bixos = {};

const listaBixos = [
  "avestruz","aguia","burro","borboleta","cachorro",
  "gato","leao","tigre","urso","elefante",
  "macaco","cavalo","camelo","coelho","cobra",
  "peixe","galinha","porco","ovelha","vaca",
  "raposa","rato","galo","jacare","camaleao"
];

const emojis = [
  "🐦","🦅","🐴","🦋","🐶",
  "🐱","🦁","🐯","🐻","🐘",
  "🐵","🐴","🐪","🐰","🐍",
  "🐟","🐔","🐷","🐑","🐮",
  "🦊","🐭","🐓","🐊","🦎"
];

let numero = 0;

for (let i = 0; i < 25; i++) {
    const nome = listaBixos[i];

    bixos[nome] = {
        nome,
        emoji: emojis[i],
        dezenas: Array.from({ length: 4 }, (_, j) => numero + j),
        vendido: false,
        dono: null
    };

    numero += 4;
}

module.exports = bixos;
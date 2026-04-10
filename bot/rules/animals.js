// Mapeamento dos 25 animais do jogo do bicho
const animals = {
  1: "Avestruz", 2: "Águia", 3: "Burro", 4: "Borboleta",
  5: "Cachorro", 6: "Cabra", 7: "Carneiro", 8: "Camelo",
  9: "Cobra", 10: "Coelho", 11: "Cavalo", 12: "Elefante",
  13: "Galo", 14: "Gato", 15: "Jacaré", 16: "Leão",
  17: "Macaco", 18: "Porco", 19: "Pavão", 20: "Peru",
  21: "Touro", 22: "Tigre", 23: "Urso", 24: "Veado",
  25: "Vaca"
};

// Cada animal corresponde a 4 dezenas (00–99)
function getAnimalByNumber(num) {
  const n = parseInt(num, 10);
  if (isNaN(n) || n < 0 || n > 99) return null;

  const group = Math.floor(n / 4) + 1; // 0–3 = grupo 1, 4–7 = grupo 2...
  return animals[group];
}

module.exports = async (context) => {
  const text = context.text.trim();

  // Se o usuário mandar uma dezena válida
  if (/^\d{2}$/.test(text)) {
    const animal = getAnimalByNumber(text);
    if (animal) {
      return `🎟️ A dezena ${text} pertence ao grupo do **${animal}**.`;
    }
  }

  return null;
};

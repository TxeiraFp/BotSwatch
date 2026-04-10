module.exports = async (context) => {
  const text = context.text.toLowerCase();

  if (text === 'oi' || text === 'olá' || text === 'bom dia') {
    return '👋 Olá! Bem-vindo à rifa do bicho! Envie uma dezena (00–99) para descobrir o animal correspondente.';
  }

  return null;
};

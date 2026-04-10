module.exports = async (context) => {
  const text = context.text.toLowerCase();

  if (text.startsWith('!help') || text.startsWith('/help')) {
    return '📖 Comandos disponíveis:\n- oi / olá / bom dia\n- !help\n- Envie uma dezena (00–99) para ver o animal correspondente.';
  }

  return null;
};

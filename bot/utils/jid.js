function toWhatsappJid(numero) {
    if (!numero) return null;

    const str = String(numero);

    // já é jid válido (WhatsApp ou LID ou grupo)
    if (str.includes("@")) {
        return str;
    }

    // limpa só se for número puro
    return str.replace(/\D/g, "") + "@s.whatsapp.net";
}

module.exports = { toWhatsappJid };
function normalizeJid(jid) {
    if (!jid || typeof jid !== "string") return null;

    // 🚫 ignora grupo
    if (jid.endsWith("@g.us")) return null;

    // ✅ mantém LID intacto (CRÍTICO)
    if (jid.endsWith("@lid")) return jid;

    // ✅ já padrão WhatsApp
    if (jid.endsWith("@s.whatsapp.net")) return jid;

    // fallback apenas se for número cru
    const num = jid.replace(/\D/g, "");
    if (!num) return null;

    return `${num}@s.whatsapp.net`;
}
module.exports = { normalizeJid };
function phoneToJid(phone) {
    if (!phone) return null;

    let number = String(phone)
        .replace(/\D/g, "")
        .replace(/@.*/, "");

    if (number.length < 10) return null;

    if (!number.startsWith("55")) {
        number = "55" + number;
    }

    return `${number}@s.whatsapp.net`;
}
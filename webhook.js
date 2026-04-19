const phoneToJid = require("../utils/phoneToJid");
const fs = require("fs");

app.post("/webhook/asaas", async (req, res) => {
    const event = req.body;

    try {
        if (event.event === "PAYMENT_RECEIVED") {

            const paymentId = event.payment.id;

            const game = await GameSchema.findOne({ paymentId });

            if (!game) return res.sendStatus(200);

            if (game.status === "PAID") return res.sendStatus(200);

            game.status = "PAID";
            game.pagoEm = new Date();
            await game.save();

            const jid = phoneToJid(game.phone);

            const filePath = await gerarComprovante(game);

            await new Promise(r => setTimeout(r, 2000));

            await global.conn.sendMessage(jid, {
                document: fs.readFileSync(filePath),
                fileName: "comprovante.pdf",
                mimetype: "application/pdf",
                caption: "✅ Pagamento confirmado!"
            }, {
                timeoutMs: 120000
            });

            console.log("📄 PDF enviado para:", jid);
        }

        res.sendStatus(200);

    } catch (err) {
        console.error("🔥 webhook error:", err);
        res.sendStatus(200);
    }
});
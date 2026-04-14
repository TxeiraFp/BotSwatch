app.post("/webhook/asaas", (req, res) => {
    const event = req.body;

    if (event.event === "PAYMENT_RECEIVED") {
        const paymentId = event.payment.id;

        // atualiza no banco
    }

    res.sendStatus(200);
});
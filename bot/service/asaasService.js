const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

if (!process.env.ASAAS_API_KEY) {
    throw new Error("❌ ASAAS_API_KEY não definida no .env");
}

console.log("KEY ASAAS:", process.env.ASAAS_API_KEY);

const api = axios.create({
    baseURL: process.env.ASAAS_BASE_URL || "https://sandbox.asaas.com/api/v3",
    headers: {
        "Content-Type": "application/json",
        access_token: process.env.ASAAS_API_KEY
    }
});

function limparTelefone(numero) {
    return String(numero).replace(/\D/g, "");
}

const CPF_FIXO = "11144477735";

async function getOrCreateCustomer({ nome, telefone }) {
    try {
        const phone = limparTelefone(telefone);

        // 🔍 busca cliente existente
        const res = await api.get("/customers", {
            params: { phone }
        });

        if (res.data.data.length > 0) {
            const customer = res.data.data[0];

            // 🔥 garante CPF no cliente existente
            if (!customer.cpfCnpj) {
                await api.put(`/customers/${customer.id}`, {
                    cpfCnpj: CPF_FIXO
                });
            }

            return customer.id;
        }

        // 🆕 cria cliente novo (AQUI era o erro)
        const create = await api.post("/customers", {
            name: nome,
            cpfCnpj: CPF_FIXO,
            phone,
            mobilePhone: phone
        });

        return create.data.id;

    } catch (err) {
        console.error("Erro cliente Asaas:", err.response?.data || err.message);
        throw err;
    }
}

async function criarPagamentoPix({ nome, telefone, valor, descricao }) {
    try {
        const customerId = await getOrCreateCustomer({ nome, telefone });

        const idempotencyKey = uuidv4();

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 1);

        const formattedDueDate = dueDate.toISOString().split("T")[0];

        const payment = await api.post("/payments", {
            customer: customerId,
            billingType: "PIX",
            value: Number(parseFloat(valor).toFixed(2)),
            dueDate: formattedDueDate,
            description: descricao,
            externalReference: idempotencyKey
        });

        const paymentId = payment.data.id;

        let pix = null;

        for (let i = 0; i < 5; i++) {
            const resPix = await api.get(`/payments/${paymentId}/pixQrCode`);

            if (resPix.data?.payload) {
                pix = resPix.data;
                break;
            }

            await new Promise(r => setTimeout(r, 1000));
        }

        if (!pix) {
            throw new Error("Erro ao gerar PIX");
        }

        return {
            id: paymentId,
            status: payment.data.status,
            valor,
            copiaCola: pix.payload,
            qrCodeBase64: pix.encodedImage,
            expiration: pix.expirationDate
        };

    } catch (err) {
        console.error("Erro pagamento PIX:", err.response?.data || err.message);
        return null;
    }
}

module.exports = {
    criarPagamentoPix
};
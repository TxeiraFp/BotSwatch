const mongoose = require("mongoose");

const GameSchema = new mongoose.Schema({
    nome: String,
    phone: String,
    bixos: [
        {
            nome: String,
            dezenas: [Number]
        }
    ],

    dezenas: [Number],

    valor: Number,

    paymentId: String,

    status: {
        type: String,
        default: "PENDING" // 👈 importante
    },

    pixQrCode: String,

    pagoEm: Date, // 👈 quando confirmar pagamento

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Game", GameSchema);
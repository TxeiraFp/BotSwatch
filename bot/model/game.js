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

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Game", GameSchema);
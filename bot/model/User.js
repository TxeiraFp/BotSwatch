const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    numero: { type: String, unique: true },
    nome: String,
    dezenasCompradas: [Number], // ex: [12, 45, 78]
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
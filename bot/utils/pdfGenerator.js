const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const QRCode = require("qrcode");

async function gerarComprovante(game) {
  const {
    nome,
    phone,
    bixos = [],
    dezenas = [],
    valor = 0,
    paymentId,
    status = "PENDING",
    createdAt,
    pagoEm
  } = game;

  const protocolo = `RF-${Date.now()}`;

  const codigoAutenticacao = crypto
    .createHash("sha256")
    .update(`${phone}${paymentId}${valor}${Date.now()}`)
    .digest("hex")
    .substring(0, 20)
    .toUpperCase();

  const dir = path.join(__dirname, "../comprovantes");
  fs.mkdirSync(dir, { recursive: true });

  const fileName = `comprovante-${phone}-${Date.now()}.pdf`;
  const filePath = path.join(dir, fileName);

  const validacaoURL = `https://seudominio.com/validar/${codigoAutenticacao}`;
  const qrCodeBase64 = await QRCode.toDataURL(validacaoURL);

  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(filePath);

  doc.pipe(stream);

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);

    // ===========================
    // MARCA D'ÁGUA
    // ===========================
    doc.save();
    doc.opacity(0.06);
    doc.fontSize(60).text("RIFA OFICIAL", 0, 300, {
      align: "center"
    });
    doc.restore();

    // ===========================
    // CABEÇALHO
    // ===========================
    doc.fontSize(18).font("Helvetica-Bold")
      .text("COMPROVANTE DE COMPRA", { align: "center" });

    doc.fontSize(10)
      .text("Documento gerado automaticamente", { align: "center" });

    doc.moveDown();
    doc.text(`Emitido: ${new Date().toLocaleString()}`, { align: "center" });

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // ===========================
    // IDENTIFICAÇÃO
    // ===========================
    doc.fontSize(12).font("Helvetica-Bold")
      .text(`Protocolo: ${protocolo}`);

    doc.text(`Código: ${codigoAutenticacao}`);
    doc.text(`Payment ID: ${paymentId}`);
    doc.moveDown();

    // ===========================
    // DADOS CLIENTE
    // ===========================
    doc.fontSize(14).text("DADOS DO CLIENTE");

    doc.fontSize(11).font("Helvetica");
    doc.text(`Nome: ${nome}`);
    doc.text(`Telefone: ${phone}`);
    doc.text(`Status: ${status}`);

    doc.text(`Criado em: ${createdAt ? new Date(createdAt).toLocaleString() : "-"}`);
    doc.text(`Pago em: ${pagoEm ? new Date(pagoEm).toLocaleString() : "NÃO PAGO"}`);

    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // ===========================
    // VALORES
    // ===========================
    doc.fontSize(14).text("FINANCEIRO");

    doc.fontSize(11);
    doc.text(`Valor total: R$ ${Number(valor).toFixed(2)}`);

    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // ===========================
    // BIXOS
    // ===========================
    doc.fontSize(14).text("BIXOS COMPRADOS");

    doc.fontSize(11);

    bixos.forEach((b, i) => {
      doc.text(`${i + 1}. ${b.nome}`);
      doc.text(`   Dezenas: ${(b.dezenas || []).join(", ")}`);
      doc.moveDown(0.3);
    });

    doc.moveDown(2);

    // ===========================
    // QR CODE
    // ===========================
    const qrImage = qrCodeBase64.replace(/^data:image\/png;base64,/, "");
    const qrBuffer = Buffer.from(qrImage, "base64");

    doc.image(qrBuffer, 420, doc.y - 20, { width: 100 });

    doc.fontSize(9)
      .text("Validação de autenticidade", 400, doc.y + 90, {
        width: 150,
        align: "center"
      });

    doc.moveDown(3);

    // ===========================
    // RODAPÉ
    // ===========================
    doc.moveTo(50, 750).lineTo(550, 750).stroke();

    doc.fontSize(8)
      .text(
        "Sistema automatizado de rifas - Documento digital",
        50,
        760,
        { align: "center", width: 500 }
      );

    doc.end();
  });

  return filePath;
}

module.exports = { gerarComprovante };
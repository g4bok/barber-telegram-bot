
async function handleExistingUser(ctx, docSnap) {
    const nome = docSnap.data().nome;
    ctx.deleteMessage();
    ctx.telegram.sendMessage(ctx.chat.id, `<i>👋 Bentornato <b>${nome}</b>, qua sotto trovi il menù per gestire le tue prenotazioni!</i>`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "✅ Prenota un taglio", callback_data: "prenota" }],
                [{ text: "✂️ Taglio prenotato", callback_data: "taglio" }],
            ],
        }, parse_mode: "HTML",
    });
}
function handleNewUser(db, ctx, bot) {
    ctx.telegram.sendMessage(ctx.from.id, `<i>👋 Benvenuto</i> <b>${ctx.from.first_name}</b>!\n\n<i>Per registrarti correttamente, digita:</i>\n\n<b>📝 Nome/Cognome/Numero di telefono</b> compresi gli '/' (slash).\n\n✅<i> Esempio:</i> <b>Mario/Rossi/3556576565</b>`, { parse_mode: "HTML" });
    bot.on(["video", "photo", "sticker"], (ctx2) => {
        ctx2.telegram.sendMessage(ctx2.from.id, `<i>Ops! Scusa ma non capisco.\n\nRiprova cliccando <b>/start!</b></i>`, { parse_mode: "HTML" }
        );
    });
    bot.on("text", async (ctx2) => {
        const mydati = ctx2.message.text.split("/");
        if (mydati.length !== 3) {
        } else {
            const Nome = mydati[0];
            const Cognome = mydati[1];
            const NumTelefono = mydati[2];
            const id = ctx2.from.id.toString();

            if ((/^[a-z]+$/i.test(Nome) || Nome.length > 19) && (/^[a-z]+$/i.test(Cognome) || Cognome.length > 19) && NumTelefono != NaN && NumTelefono > 0) {
                await registerUser(db, id, Nome, Cognome, NumTelefono);
                ctx2.telegram.sendMessage(ctx2.from.id, `<i><b>Ti sei registrato correttamente</b>, clicca <b>'/start'</b> per prenotare il tuo appuntamento!</i>`, { parse_mode: "HTML" });
            } else {
                ctx2.telegram.sendMessage(ctx2.from.id, `<i><b>C'è stato un errore!</b>, clicca <b>'/start'</b> per riprendere la registrazione!</i>`, { parse_mode: "HTML" });
            }
        }
    });
}
async function registerUser(db, id, Nome, Cognome, NumTelefono) {
    const docRef = db.collection("Clienti").doc(id);
    await docRef.set({ nome: Nome, cognome: Cognome, cell: NumTelefono, token: false, app: [] });
}

module.exports = { handleExistingUser, handleNewUser };
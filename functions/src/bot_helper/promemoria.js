const DateFormattata = require('../formatting/dateFormattata.js');

async function message(db, bot) {
    try {
        const today = new Date();
        today.setDate(today.getDate() + 1);
        const dateForm = new DateFormattata(today).getDataFormattata();
        const docSnap = await db.collection(`/Appuntamenti/${dateForm}/Orari`).get();
        if (!docSnap.empty) {
            docSnap.forEach((doc) => {
                bot.telegram.sendMessage(doc.data().id, `<i>👋 Ciao <b>${doc.data().nome}</b>, ti scrivo per ricordarti che hai un appuntamento prenotato per domani:\n✂️ <b>${dateForm}</b> ore <b>${doc.data().ora}</b>.</i>\n\n<i>Questo messaggio viene generato automaticamente. Per qualsiasi problema contattare Mattia.</i>`, { parse_mode: 'HTML' });
            })
        }
    }
    catch (err) {
        bot.telegram.sendMessage(process.env.AUTHUSERS2, 'Errore durante esecuzione della schedule ' + err)
    }
}

module.exports = { message }
/* bot.action("sì1", async (ctx) => {
  ctx.editMessageText(`<i><b>❗ PROMEMORIA INVIATO</b>\n\nComandi per l'amministratore:</i>`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔎 Tagli di uno specifico giorno",callback_data: "tagli_specifici" }],
          [{ text: `🔧 Gestisci i token`, callback_data: "gestisci_token" }],
          [{ text: `📅 Gestisci date disponibili`, callback_data: "gestisci_date" }],
          [{ text: `📈 Statistiche`, callback_data: "dati" }],
        ],
      }, parse_mode: "HTML",
    }
  );
  let avv = await db.collection("Clienti").get();
  avv.forEach(async (doc) => { await bot.telegram.sendPhoto(doc.id, `LINK IMMAGINE`) });
}); */
/* function gestisciErrore(ctx,codiceErrore) {
  ctx.editMessageText(`<i>Errore ${codiceErrore}.. Riprova, se l'errore persiste manda uno screen a Mattia con il codice di errore.</i>`,
    {
      reply_markup: {
        inline_keyboard: [[{ text: "🔙 Torna al menù principale", callback_data: "menu" }]],
      }, parse_mode: "HTML",
    }
  );
} 
bot.action("avviso_paddle", async (ctx) => {
  ctx.editMessageText("<i>Se vuoi iniviare un promemoria, a <b>tutti</b> gli iscritti al BOT, sul Torneo di Paddle clicca sì altrimenti torna al menù principale! </i>",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Sì", callback_data: "sì1" }],
          [{ text: "🔙 Torna al menù amministratore", callback_data: "menu_admin" }],
        ],
      }, parse_mode: "HTML",
    }
  );
});
*/
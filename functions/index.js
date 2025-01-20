const functions = require("firebase-functions");
const { initializeApp, cert } = require("firebase-admin/app");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { Telegraf } = require("telegraf");
const Calendar = require("./src/calendar/calendar.js")
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const NormalData = require("./src/formatting/normalData.js");
const schedules = require('./src/bot_helper/schedules.js');
const sign_in = require('./src/bot_helper/sign_in.js');
const handleApp = require('./others/handleApp.js');
const promemoria = require('./src/bot_helper/promemoria.js');
require("dotenv").config();

const serviceAccount = require("./others/serviceAccountKey.json");
initializeApp({
  credential: cert(serviceAccount),
});

const bot = new Telegraf(process.env.TOKEN, {
  telegram: { webhookReply: true },
});
const db = getFirestore();
const calendar = new Calendar(bot, false);
const calendar_admin = new Calendar(bot, true);

const authorizedIds = [process.env.AUTHUSERS1, process.env.AUTHUSERS2].map(id => (parseInt(id, 10)))
const oraritot = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"];
const appInfo = {};
const infoUser = {};
const aI = {};
const [today, minDate, maxDate] = [new Date(), new Date(), new Date()];
minDate.setMonth(today.getMonth());
maxDate.setMonth(today.getMonth() + 2);
maxDate.setDate(31);

bot.start(async (ctx) => {
  const docRef = db.collection("Clienti").doc(ctx.from.id.toString());
  const docSnap = await docRef.get();
  if (docSnap.exists) sign_in.handleExistingUser(ctx, docSnap);
  else sign_in.handleNewUser(db, ctx, bot);
});

bot.action("menu", async (ctx) => {
  ctx.editMessageText(`💈 <i>Qua sotto trovi il menù principale per gestire i tuoi Tagli.</i>`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "✅ Prenota un taglio", callback_data: "prenota" }],
        [{ text: "✂️ Tagli prenotati", callback_data: "taglio" }],
      ],
    }, parse_mode: "HTML",
  }
  );
});

bot.action("prenota", async (ctx) => {
  const docCliente = await db.collection("Clienti").doc(ctx.from.id.toString()).get();
  const datiCliente = docCliente.data();
  if (!datiCliente.token && datiCliente.app.length > 1) {
    return ctx.editMessageText(`<i><b>Hai già 2 tagli prenotati.</b>\n\nClicca su <b>"✂️ Tagli prenotati"</b> per visualizzare le tue prenotazioni.</i>`, {
      reply_markup: {
        inline_keyboard: [[{ text: "✂️ Tagli prenotati", callback_data: "taglio" }]],
      }, parse_mode: "HTML",
    });
  } else {
    let giorniRimossi = [];
    const dateSnap = await db.collection("DateCancellate").get()
    if (!dateSnap.empty)
      dateSnap.forEach((doc) => { giorniRimossi.push(doc.data().data) });
    const fullDatesArray = await schedules.fullDates(db);
    const deleteDates = giorniRimossi.map(dateString => new NormalData(dateString).getOnlyDate());
    ctx.editMessageText('❗❗❗ Vi chiedo se possibile di lasciare liberi gli orari serali della giornata per coloro che escono tardi da lavoro.\n\n✍️ Seleziona una data:', {
      ...calendar.setMinDate(minDate).setMaxDate(maxDate).setDeleteDates(deleteDates).setFullDates(fullDatesArray).getCalendar(), parse_mode: 'HTML'
    })
  }
})

calendar.setDateListener(async (ctx, date) => {
  handleApp.handleProp(appInfo, ctx.from.id, 'data', date)
  let ggScelto = date.split(' ');
  const docSnap = await db.collection(`/Appuntamenti/${appInfo[ctx.from.id].data}/Orari`).get();
  const orariOccupati = docSnap ? docSnap.docs.map(doc => doc.data().ora) : [];
  const OrariDisponibili = await schedules.getOrariDisponibili(ggScelto, orariOccupati);
  schedules.handleOrarioScelto(db, ctx, appInfo[ctx.from.id].data, OrariDisponibili);
});

bot.action(oraritot, (ctx) => {
  handleApp.handleProp(appInfo, ctx.from.id, 'hour', ctx.update.callback_query.data);
  ctx.editMessageText(`<i>Vuoi confermare l'appuntamento?\n\n✂️ <b>${appInfo[ctx.from.id].data} ore ${appInfo[ctx.from.id].hour}</b>.</i>`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "✅ Sì, confermo!", callback_data: "si" }],
        [{ text: "🔙 Torna al menù principale", callback_data: "menu" }],
      ],
    }, parse_mode: "HTML",
  });
});

bot.action('si', async (ctx) => {
  try {
    if (appInfo[ctx.from.id].data == null || appInfo[ctx.from.id].hour == null) {
      ctx.editMessageText(`<i>C'è stato un problema durante la prenotazione, riprova più tardi.</i>`, {
        reply_markup: {
          inline_keyboard: [[{ text: "🔙 Torna al calendario", callback_data: "prenota" }]],
        }, parse_mode: "HTML",
      });
    }
    await db.runTransaction(async (transaction) => {
      const docRef = db.collection(`/Appuntamenti/${appInfo[ctx.from.id].data}/Orari`).doc(appInfo[ctx.from.id].hour);
      const bookedSnapshot = await transaction.get(docRef);
      if (bookedSnapshot.exists) {
        return ctx.editMessageText(`<i>Questo appuntamento è appena stato prenotato, pertanto non è più disponibile.</i>`, {
          reply_markup: {
            inline_keyboard: [[{ text: "🔙 Torna al calendario", callback_data: "prenota" }]],
          }, parse_mode: "HTML",
        });
      }
      const docCliente = db.collection("Clienti").doc(ctx.from.id.toString());
      const docs = await transaction.get(docCliente);
      if (!docs.exists) {
        return ctx.editMessageText(`<i>Utente non riconosciuto, riprova più tardi.</i>`, {
          reply_markup: {
            inline_keyboard: [[{ text: "🔙 Torna al calendario", callback_data: "prenota" }]],
          }, parse_mode: "HTML",
        });
      }
      if (docs.data().token === false && docs.data().app.length > 1) {
        return ctx.editMessageText(`<i><b>Hai già 2 tagli prenotati.</b>\n\nClicca su <b>"✂️ Tagli prenotati"</b> per visualizzare le tue prenotazioni.</i>`, {
          reply_markup: {
            inline_keyboard: [[{ text: "✂️ Tagli prenotati", callback_data: "taglio" }]],
          }, parse_mode: "HTML",
        });
      }
      transaction.set(docRef, { nome: docs.data().nome, cognome: docs.data().cognome, cell: docs.data().cell, ora: appInfo[ctx.from.id].hour, id: ctx.from.id.toString() });
      transaction.update(docCliente, {
        app: FieldValue.arrayUnion(`${appInfo[ctx.from.id].data} ore ${appInfo[ctx.from.id].hour}`),
      });
      transaction.set(db.collection('Appuntamenti').doc(`${appInfo[ctx.from.id].data}`), { full: false }, { merge: true });
      ctx.editMessageText(`<i>Clicca su <b>"✂️ Tagli prenotati"</b> per verificare le tua prenotazione.</i>`, {
        reply_markup: {
          inline_keyboard: [[{ text: "✂️ Tagli prenotati", callback_data: "taglio" }]],
        }, parse_mode: "HTML",
      });
    });
  } catch (err) {
    return ctx.editMessageText(`<i>C'è stato un errore nella prenotazione oppure l'appuntamento è appena stato prenotato.</i> ${err}`, {
      reply_markup: {
        inline_keyboard: [[{ text: "🔙 Torna al calendario", callback_data: "prenota" }]],
      }, parse_mode: "HTML",
    });
  }
})

bot.action('taglio', async (ctx) => {
  let tagliprenotati = [], stampa_tagliprenotati = [], taglio_date, oggi = new Date();
  try {
    const docs = db.collection("Clienti").doc(ctx.from.id.toString());
    const docSnap = await docs.get();
    const pren = docSnap.data().app;
    pren.forEach(async (taglio) => {
      t = taglio.toString().split(' ');
      taglio_td = taglio;
      taglio_date = new NormalData(taglio).getDate();
      if (taglio_date.getTime() > oggi.getTime()) {
        stampa_tagliprenotati.push([{ text: `✂️ ${taglio}`, callback_data: `✂️ ${taglio}` }]);
        tagliprenotati.push(`✂️ ${taglio}`);
      } else {
        let id = ctx.from.id.toString();
        await db.collection("Clienti").doc(id).update({ app: FieldValue.arrayRemove(taglio_td), cronologia: FieldValue.arrayUnion(taglio_td) });
      }
    });
    stampa_tagliprenotati.push([{ text: "🔙 Torna al menù principale", callback_data: "menu" }]);
    if (tagliprenotati == "") {
      ctx.editMessageText(`<i>🥺 OOOPS, Non hai tagli prenotati.\n\nPuoi prenotarne uno cliccando su\n<b>'✅ Prenota un taglio'</b></i>`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Prenota un taglio", callback_data: "prenota" }],
            [{ text: "🔙 Torna al menù principale", callback_data: "menu" }],
          ],
        }, parse_mode: "HTML",
      }
      );
    } else {
      ctx.editMessageText(`<i>Hai prenotato i seguenti appuntamenti:</i>`, {
        reply_markup: {
          inline_keyboard: stampa_tagliprenotati,
        }, parse_mode: "HTML",
      });
    }
  } catch (err) {
    return ctx.editMessageText(`<i>C'è stato un errore, riprova.</i> /start`);
  }

  bot.action(tagliprenotati, async (ctx) => {
    const g = ctx.update.callback_query.data.split(" ");
    handleApp.handleProp(infoUser, ctx.from.id, 'dH', `${g[1]} ${g[2]} ${g[3]} ${g[4]} ${g[5]} ${g[6]}`);
    handleApp.handleProp(infoUser, ctx.from.id, 'd', `${g[1]} ${g[2]} ${g[3]} ${g[4]}`);
    handleApp.handleProp(infoUser, ctx.from.id, 'h', `${g[6]}`);
    ctx.editMessageText(`<i>Sei sicuro di voler cancellare la prenotazione per il giorno:\n\n<b>${g.join(' ')}</b> ?</i>`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ Sì, voglio cancellarla", callback_data: "cancella_taglio_cliente" }],
          [{ text: "🔙 Torna alla lista delle prenotazioni", callback_data: "taglio", }]
        ]
      }, parse_mode: "HTML",
    });
  });
})

bot.action("cancella_taglio_cliente", async (ctx) => {
  try {
    await db.runTransaction(async (t) => {
      let id = ctx.from.id.toString();
      let docs = db.collection("Clienti").doc(id);
      const dateHour = db.collection(`/Appuntamenti/${infoUser[ctx.from.id].d}/Orari`).doc(infoUser[ctx.from.id].h);
      const dateFull = db.collection('Appuntamenti').doc(infoUser[ctx.from.id].d)
      t.update(docs, { app: FieldValue.arrayRemove(infoUser[ctx.from.id].dH) });
      if ((await (dateFull.get())).exists) t.update(dateFull, { full: false });
      if ((await (dateHour.get())).exists) t.delete(dateHour);
    });
    return ctx.editMessageText(`<i>Hai cancellato con successo la prenotazione.</i>`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Prenota un taglio", callback_data: "prenota" }],
          [{ text: "✂️ Tagli prenotati", callback_data: "taglio" }],
        ],
      }, parse_mode: "HTML",
    });
  } catch (err) {
    ctx.editMessageText(`<i>C'è stato un errore inaspettato nella cancellazione, riprova.</i>` + err, {
      reply_markup: {
        inline_keyboard: [[{ text: "✂️ Tagli prenotati", callback_data: "taglio" }]],
      }, parse_mode: "HTML",
    });
  }
});

/******************* A  D  M  I  N ********************/

bot.command("admin", (ctx) => {
  if (authorizedIds.includes(ctx.from.id)) {
    bot.telegram.sendMessage(ctx.chat.id, `<i>Comandi per l'amministratore:</i>`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔎 Tagli di uno specifico giorno", callback_data: "tagli_specifici" }],
          [{ text: `🔧 Gestisci i token`, callback_data: "gestisci_token" }],
          [{ text: `📅 Gestisci date disponibili`, callback_data: "gestisci_date" }],
          [{ text: `📈 Statistiche`, callback_data: "dati" }],
        ],
      }, parse_mode: "HTML",
    });
  } else bot.telegram.sendMessage(ctx.chat.id, "Non sei un amministratore!");
});

bot.action("menu_admin", (ctx) => {
  ctx.editMessageText(`<i>Comandi per l'amministratore:</i>`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔎 Tagli di uno specifico giorno", callback_data: "tagli_specifici" }],
        [{ text: `🔧 Gestisci i token`, callback_data: "gestisci_token" }],
        [{ text: `📅 Gestisci date disponibili`, callback_data: "gestisci_date" },],
        [{ text: `📈 Statistiche`, callback_data: "dati" }],
      ],
    }, parse_mode: "HTML",
  });
});

bot.action("tagli_specifici", async (ctx) => {
  ctx.editMessageText('Seleziona una data ✍️', { ...calendar_admin.setMinDate(minDate).setMaxDate(maxDate).getCalendar() })
})

calendar_admin.setDateListener_admin(async (ctx, date) => {
  handleApp.handleProp(aI, ctx.from.id, 'data', date.replace('admin', ''))
  let admin_AppGiornoScelto = [], appToDelete = [];
  let gg = aI[ctx.from.id].data.split(' ');
  let [giorno, numero, mese, anno] = gg;
  let dates = `${giorno} ${numero} ${mese} ${anno}`;
  let docSnap = await db.collection(`/Appuntamenti/${aI[ctx.from.id].data}/Orari`).get();
  docSnap.forEach((doc) => {
    appToDelete.push(`${dates} ${doc.id} ${doc.data().cell} ${doc.data().nome} ${doc.data().cognome}`);
    admin_AppGiornoScelto.push([{ text: `${doc.id} ➔ ${doc.data().nome} ${doc.data().cognome} ${doc.data().cell}`, callback_data: `${dates} ${doc.id} ${doc.data().cell} ${doc.data().nome} ${doc.data().cognome}` },
    ]);
  });
  admin_AppGiornoScelto.push([{ text: "🔙 Torna al calendario", callback_data: "tagli_specifici" }]);
  ctx.editMessageText(`<i>Appuntamenti </i><b>${dates}</b>:`, {
    reply_markup: {
      inline_keyboard: admin_AppGiornoScelto,
    },
    parse_mode: "HTML",
  });

  bot.action(appToDelete, (ctx) => {
    let toDelete = ctx.update.callback_query.data.split(" ");
    let id = ctx.from.id;
    handleApp.handleProp(aI, id, 'ore', toDelete[4]);
    handleApp.handleProp(aI, id, 'num', toDelete[5]);
    handleApp.handleProp(aI, id, 'nom', toDelete.slice(6).join(' '));

    ctx.editMessageText(`<i>❌ Vuoi cancellare questo appuntamento?\n\n<b>✂️ ${aI[id].data} ore ${aI[id].ore}\n\n➔ di ${aI[id].nom}</b>.</i>`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ Sì, voglio cancellarlo", callback_data: "cancella_taglio" }],
          [{ text: "🔙 Torna alla lista dei giorni", callback_data: "tagli_specifici" }],
        ],
      }, parse_mode: "HTML",
    });
  });
});

bot.action("cancella_taglio", async (ctx) => {
  try {
    console.log(aI[ctx.from.id])
    let id;
    let docSnap = await db.collection("Clienti").where("cell", "==", aI[ctx.from.id].num).get();
    docSnap.forEach((app) => { id = app.id });
    await db.runTransaction(async (t) => {
      t.update(db.collection("Clienti").doc(id), { app: FieldValue.arrayRemove(`${aI[ctx.from.id].data} ore ${aI[ctx.from.id].ore}`) });
      t.update(db.collection("Appuntamenti").doc(aI[ctx.from.id].data), { full: false });
      t.delete(db.collection(`/Appuntamenti/${aI[ctx.from.id].data}/Orari`).doc(aI[ctx.from.id].ore))
    });
    ctx.editMessageText(`<i>Appuntamento cancellato con successo.</i>`, {
      reply_markup: {
        inline_keyboard: [[{ text: "🔙 Torna al menù amministratore", callback_data: "menu_admin" }]],
      }, parse_mode: "HTML",
    });
  } catch (err) {
    ctx.editMessageText(`<i>Errore durante la cancellazione, riprova.</i>`, {
      reply_markup: {
        inline_keyboard: [[{ text: "🔙 Torna al menù amministratore", callback_data: "menu_admin" }]],
      }, parse_mode: "HTML",
    });
  }
})

bot.action("gestisci_token", async (ctx) => {
  ctx.editMessageText(`<i>Per poter aggiungere/revocare un <b>token</b> si possono utilizzare i comandi:\n\n➔ /GiveToken\n\n➔ /RevokeToken\n\nseguiti dal <b>numero di telefono del cliente registrato</b> al quale si vuole assegnare/revocare il <b>token</b>.\n\n</i><i>Esempi:\n/GiveToken 3452345654\n/RevokeToken 3452345654</i>`,
    {
      reply_markup: {
        inline_keyboard: [[{ text: "🔙 Torna al menù amministratore", callback_data: "menu_admin" }]]
      }, parse_mode: "HTML",
    });
});

bot.command("NumToId", async (ctx) => {
  if (authorizedIds.includes(ctx.from.id)) {
    NumTelefono = ctx.message.text.split(" ");
    let id;
    let docSnap = await db.collection("Clienti").where("cell", "==", `${NumTelefono[1].toString()}`).get();
    docSnap.forEach((c) => { id = c.id; });
    if (id != null) {
      ctx.telegram.sendMessage(ctx.from.id, `ID corrispondente al numero ${NumTelefono[1]}: ${id}`);
    } else {
      ctx.telegram.sendMessage(ctx.from.id, `Cliente non trovato, il numero non corrisponde ad un utente registrato.`);
    }
  } else {
    ctx.telegram.sendMessage(ctx.from.id, `<i>Solo gli amministratori possono usare questo comando.</i>`, { parse_mode: "HTML" });
  }
});

bot.command("NomeToId", async (ctx) => {
  if (authorizedIds.includes(ctx.from.id)) {
    Cognome = ctx.message.text.split(" ");
    let docSnap = await db.collection("Clienti").where("cognome", "==", `${Cognome[1].toString()}`).get();
    docSnap.forEach((c) => {
      ctx.telegram.sendMessage(ctx.from.id, `ID corrispondente al Cognome ${Cognome[1]}: ${c.id}`);
    });
  } else {
    ctx.telegram.sendMessage(ctx.from.id, `<i>Solo gli amministratori possono usare questo comando.</i>`, { parse_mode: "HTML" });
  }
})

bot.command("RevokeToken", async (ctx) => {
  if (authorizedIds.includes(ctx.from.id)) {
    NumTelefono = ctx.message.text.split(" ");
    if (NumTelefono[1] != NaN && NumTelefono[1] > 0) {
      let id;
      let docSnap = await db.collection("Clienti").where("cell", "==", `${NumTelefono[1].toString()}`).get();
      docSnap.forEach((app) => { id = app.id; });
      await db.collection("Clienti").doc(id).update({ token: false })
        .then(() => {
          ctx.telegram.sendMessage(ctx.from.id, `<i>Token rimosso correttamente.</i>`, { parse_mode: "HTML" });
        })
        .catch((err) => {
          ctx.telegram.sendMessage(ctx.from.id, `<i>Qualcosa dev'essere andato storto, riprova.</i>` + err, { parse_mode: "HTML" });
        });
    } else {
      ctx.telegram.sendMessage(ctx.from.id, `<i>Qualcosa dev'essere andato storto, riprova.</i>`, { parse_mode: "HTML" });
    }
  }
});

bot.command("GiveToken", async (ctx) => {
  if (authorizedIds.includes(ctx.from.id)) {
    NumTelefono = ctx.message.text.split(" ");
    if (NumTelefono[1] != NaN && NumTelefono[1] > 0) {
      let id;
      let docSnap = await db.collection("Clienti").where("cell", "==", `${NumTelefono[1].toString()}`).get();
      docSnap.forEach((app) => { id = app.id; });
      await db.collection("Clienti").doc(id).update({ token: true, })
        .then(() => {
          ctx.telegram.sendMessage(ctx.from.id, `<i>Token settato correttamente.</i>`, { parse_mode: "HTML" });
        })
        .catch((err) => {
          ctx.telegram.sendMessage(ctx.from.id, `<i>Qualcosa dev'essere andato storto, riprova.</i>` + err, { parse_mode: "HTML" });
        });
    } else {
      ctx.telegram.sendMessage(ctx.from.id, `<i>Qualcosa dev'essere andato storto, riprova.</i>`, { parse_mode: "HTML" });
    }
  }
});

bot.action("gestisci_date", async (ctx) => {
  ctx.editMessageText(`<i>Questo comando permette di poter <b>rimuovere dalla lista dei giorni disponibili</b> il giorno desiderato. Per poter usufruire dell'apposito comando si segua l'esempio:</i>\n\n➔ /rimuovi Lun 12 Febbraio 2024`,
    {
      reply_markup: {
        inline_keyboard: [[{ text: "🔙 Torna al menù amministratore", callback_data: "menu_admin" }]],
      }, parse_mode: "HTML",
    }
  );
});

bot.command("rimuovi", async (ctx) => {
  if (authorizedIds.includes(ctx.from.id)) {
    de = ctx.message.text.split(" ");
    await db.collection("DateCancellate").add({ data: `${de[1]} ${de[2]} ${de[3]} ${de[4]}` })
      .then(() => {
        ctx.telegram.sendMessage(ctx.from.id, `<i>Data rimossa correttamente dalla lista.</i>`, { parse_mode: "HTML" })
      })
      .catch((err) => {
        ctx.telegram.sendMessage(ctx.from.id, `<i>Opsss, c'è stato un errore nell'inserimento della data.</i>` + err, { parse_mode: "HTML" });
      });
  }
});

bot.action("dati", async (ctx) => {
  let docRef = db.collection("Clienti");
  let Snap = await docRef.get();
  if (Snap) {
    ctx.editMessageText(`<i>Ci sono <b>${Snap.size}</b> clienti registrati.</i>`, {
      reply_markup: {
        inline_keyboard: [[{ text: "🔙 Torna al menù amministratore", callback_data: "menu_admin" }]],
      }, parse_mode: "HTML",
    });
  } else {
    ctx.editMessageText(`<i>Errore, riprova più tardi.</i>`, {
      reply_markup: {
        inline_keyboard: [[{ text: "🔙 Torna al menù amministratore", callback_data: "menu_admin" }]],
      }, parse_mode: "HTML",
    });
  }
});

exports.promemoriaBot = onSchedule('every day 20:00', async () => {
  await promemoria.message(db, bot);
})

exports.Bot_Mattia = functions.https.onRequest(async (request, response) => {
  bot.handleUpdate(request.body, response);
});

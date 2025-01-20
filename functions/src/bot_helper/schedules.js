const NormalData = require("../formatting/normalData.js");

const orariSett = ["14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"];
const orariSabatoVecchi = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];
const orariLunMer = ["14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"];
const orariVen = ["15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"];

const Lun = ["11:00", "11:30", "12:00", "12:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"]
const MarMer = ["09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "14:00", "14:30", "15:00", "15:30"]
const Gio = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "18:00", "18:30", "19:00", "19:30", "20:00"]
const Ven = ["10:30", "11:00", "11:30", "12:00", "12:30", "14:00", "15:30", "16:00", "16:30", "17:00"]
const Sab = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00"]

async function handleOrarioScelto(db, ctx, date, OrariDisponibili) {
    if (OrariDisponibili.length === 1) {
        await db.collection('Appuntamenti').doc(`${date}`).update({ full: true });
        ctx.editMessageText(`<i>L'ultimo appuntamento disponibile è stato prenotato!</i>`, {
            reply_markup: {
                inline_keyboard: [[{ text: "🔙 Torna al calendario", callback_data: "prenota" }]],
            }, parse_mode: "HTML",
        });
    } else {
        ctx.editMessageText(`<i>Seleziona un orario per il giorno\n\n✂️ <b>${date}.</b></i>`, {
            reply_markup: {
                inline_keyboard: OrariDisponibili,
            }, parse_mode: "HTML",
        });
    }
}
async function fullDates(db) {
    let fullDates = [];
    let docSnap = await db.collection("Appuntamenti").where("full", "==", true).get();
    docSnap.forEach((app) => {
        fullDates.push(app.id);
    });
    return fullDates.map(dateString => new NormalData(dateString).getOnlyDate());
}
async function getOrariDisponibili(giornoScelto, orariOccupati) {
    const orariDisponibili = [];
    const orari = getOrariSettimana(giornoScelto);
    let difference = orari.filter((x) => !orariOccupati.includes(x));
    if (difference.length !== 0) {
        let tot = difference.length;
        for (let i = 0; i < difference.length; i++) {
            if (tot >= 3) {
                orariDisponibili.push([
                    { text: difference[i], callback_data: difference[i] },
                    { text: difference[i + 1], callback_data: difference[i + 1] },
                    { text: difference[i + 2], callback_data: difference[i + 2] },
                ]);
                tot += -3;
                i += 2;
            } else if (tot >= 2) {
                tot += -2;
                orariDisponibili.push([
                    { text: difference[i], callback_data: difference[i] },
                    { text: difference[i + 1], callback_data: difference[i + 1] },
                ]);
                i++;
            } else orariDisponibili.push([{ text: difference[i], callback_data: difference[i] }]);
        }
    }
    orariDisponibili.push([{ text: "🔙 Torna alla lista dei giorni", callback_data: "prenota" }]);
    return orariDisponibili;
}
function getOrariSettimana(giorno) {
    switch (giorno[0]) {
        case "Sab": return orariSabatoVecchi;
        case "Lun":
        case "Mer": return orariLunMer;
        case "Ven": return orariVen;
        default: return orariSett;
    }
}

module.exports = { getOrariDisponibili, getOrariSettimana, fullDates, handleOrarioScelto };

const CalendarHelper = require('./calendarHelper.js');
const DateFormattata = require('../formatting/dateFormattata.js');

class Calendar {
	/**
	 * Construct the calendar
	 * @param {Telegraf} bot Telegraf bot instance
	 * @param {*} options Options to configure the calendar
	 */
	constructor(bot, admin, options) {
		this.bot = bot
		this.admin = admin
		this.helper = new CalendarHelper(options)
	}

	/**
	 * Return Calendar Markup
	 * @param {Date} date Starting date for the calendar. When null, 'today' is used
	 */
	getCalendar(date) {
		if (!date) date = new Date();

		return this.helper.getCalendarMarkup(date, this.admin);
	}
	/**
	 * Set the callback that will be called when a date is selected
	 * @param {(context: Context, date: Date) => void} onDateSelected The callback to be used
	 */
	setDateListener_admin(onDateSelected) {

		this.bot.action(/calendar-telegram-admin-date-[\d-]+/g, context => {
			if (onDateSelected) {
				let date = new DateFormattata(context.match[0].replace("calendar-telegram-admin-date-", "")).getDataFormattata()
				return context.answerCbQuery()
					.then(() => {
						onDateSelected(context, date + `admin`)
					});
			}
		});

		this.bot.action(/calendar-telegram-admin-prev-[\d-]+/g, context => {
			let dateString = context.match[0].replace("calendar-telegram-admin-prev-", "");
			let date = new Date(dateString);
			date.setMonth(date.getMonth() - 1);

			let prevText = context.callbackQuery.message.text;
			return context.answerCbQuery()
				.then(() => context.editMessageText(prevText, this.helper.getCalendarMarkup(date, true)));
		});

		this.bot.action(/calendar-telegram-admin-next-[\d-]+/g, context => {
			let dateString = context.match[0].replace("calendar-telegram-admin-next-", "");
			let date = new Date(dateString);
			let giornoCorrente = date.getDate();

			// Imposta il mese al successivo
			date.setMonth(date.getMonth() + 1);

			// Controlla se il giorno corrente supera il numero di giorni nel nuovo mese
			// Se sì, imposta la data all'ultimo giorno del mese corrente
			if (date.getDate() !== giornoCorrente) {
				date.setDate(0);
			}

			let prevText = context.callbackQuery.message.text;
			return context.answerCbQuery()
				.then(() => context.editMessageText(prevText, this.helper.getCalendarMarkup(date, true)));
		});

		this.bot.action(/calendar-telegram-admin-backmenu/, context => {
			return context.answerCbQuery()
				.then(() =>
					context.editMessageText(`<i>Comandi per l'amministratore:</i>`, {
						reply_markup: {
							inline_keyboard: [
								[{ text: "🔎 Tagli di uno specifico giorno", callback_data: "tagli_specifici" }],
								[{ text: `🔧 Gestisci i token`, callback_data: "gestisci_token" }],
								[{ text: `📅 Gestisci date disponibili`, callback_data: "gestisci_date" },],
								[{ text: `📈 Statistiche`, callback_data: "dati" }],
							],
						}, parse_mode: "HTML",
					})
				);
		});
	}
	/**
	 * Set the callback that will be called when a date is selected
	 * @param {(context: Context, date: Date) => void} onDateSelected The callback to be used
	 */
	setDateListener(onDateSelected) {

		this.bot.action(/calendar-telegram-date-[\d-]+/g, context => {
			if (onDateSelected) {
				let date = new DateFormattata(context.match[0].replace("calendar-telegram-date-", "")).getDataFormattata();
				return context.answerCbQuery().then(() => {
					onDateSelected(context, date)
				});
			}
		});

		this.bot.action(/calendar-telegram-prev-[\d-]+/g, context => {
			let dateString = context.match[0].replace("calendar-telegram-prev-", "");
			let date = new Date(dateString);
			date.setMonth(date.getMonth() - 1);

			let prevText = context.callbackQuery.message.text;
			return context.answerCbQuery()
				.then(() => context.editMessageText(prevText, this.helper.getCalendarMarkup(date, false)));
		});

		this.bot.action(/calendar-telegram-next-[\d-]+/g, context => {
			let dateString = context.match[0].replace("calendar-telegram-next-", "");
			let date = new Date(dateString);
			let giornoCorrente = date.getDate();

			// Imposta il mese al successivo
			date.setMonth(date.getMonth() + 1);

			// Controlla se il giorno corrente supera il numero di giorni nel nuovo mese
			// Se sì, imposta la data all'ultimo giorno del mese corrente
			if (date.getDate() !== giornoCorrente) {
				date.setDate(0);
			}

			let prevText = context.callbackQuery.message.text;
			return context.answerCbQuery()
				.then(() => context.editMessageText(prevText, this.helper.getCalendarMarkup(date, false)));
		});

		this.bot.action(/calendar-telegram-backmenu/, context => {
			return context.answerCbQuery().then(() => context.editMessageText(`💈 <i>Qua sotto trovi il menù principale per gestire i tuoi Tagli!</i>`, {
				reply_markup: {
					inline_keyboard: [
						[{ text: "✅ Prenota un taglio", callback_data: "prenota" }],
						[{ text: "✂️ Tagli prenotati", callback_data: "taglio" }],
					],
				}, parse_mode: "HTML",
			}));
		});
	}

	/**
	 * Minimum selectable date
	 * @param {Date} date The date to be used
	 */
	setMinDate(date) {
		this.helper.setMinDate(new Date(date));
		return this;
	}

	/**
	 * Maximum selectable date
	 * @param {Date} date The date to be used
	 */
	setMaxDate(date) {
		this.helper.setMaxDate(new Date(date));
		return this;
	}

	/**
	 * Set the week day names, where the first element is `startWeekDay` name
	 * @param {String[]} names Names to be used
	 */
	setWeekDayNames(names) {
		this.helper.setWeekDayNames(names);
		return this;
	}

	/**
	 * Set the month names
	 * @param {String[]} names Names to be used
	 */
	setMonthNames(names) {
		this.helper.setMonthNames(names);
		return this;
	}

	/**
	 * Set the first day of the week, where 0 is Sunday
	 * @param {Number} startDay Day to be used
	 */
	setStartWeekDay(startDay) {
		this.helper.setStartWeekDay(startDay);
		return this;
	}

	/**
	 * Set an array of dates to remove from the calendar
	 * @param {Date[]} fullDates
	 */
	setFullDates(fullDates) {
		this.helper.setFullDates(fullDates);
		return this;
	}

	setDeleteDates(deletedDates) {
		this.helper.setDeleteDates(deletedDates);
		return this;
	}
}

module.exports = Calendar;

const { Markup } = require('telegraf');

class CalendarHelper {
	constructor(options) {
		this.options = Object.assign({
			startWeekDay: 1,
			weekDayNames: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"],
			monthNames: [
				"Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
				"Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
			],
			minDate: null,
			maxDate: null,
			fullDates: null,
			deletedDates: null,
			admin: false
		}, options);
	}

	getCalendarMarkup(date, admin) {
		if (admin) return Markup.inlineKeyboard(this.getPage(date, this.options.deletedDates, this.options.deletedDates, admin));
		else return Markup.inlineKeyboard(this.getPage(date, this.options.fullDates, this.options.deletedDates, admin));
	}

	setMinDate(date) {
		if (this.options.maxDate && date > this.options.maxDate) {
			throw "Min date can't be greater than max date";
		}
		this.options.minDate = date;
	}

	setMaxDate(date) {
		if (this.options.minDate && date < this.options.minDate) {
			throw "Max date can't be lower than min date";
		}
		this.options.maxDate = date;
	}

	setWeekDayNames(names) {
		this.options.weekDayNames = names;
	}

	setMonthNames(names) {
		this.options.monthNames = names;
	}

	setStartWeekDay(startDay) {
		this.options.startWeekDay = startDay;
	}

	setFullDates(fullDates) {
		this.options.fullDates = fullDates;
	}

	setDeleteDates(deletedDates) {
		this.options.deletedDates = deletedDates;
	}

	addHeader(page, date, admin) {
		let monthName = this.options.monthNames[date.getMonth()];
		let year = date.getFullYear();
		let header = [];

		if (this.isInMinMonth(date)) {
			// this is min month, I push an empty button
			header.push(Markup.button.callback(" ", "calendar-telegram-ignore-minmonth"));
		}
		else {
			if (admin) header.push(Markup.button.callback("<<", "calendar-telegram-admin-prev-" + CalendarHelper.toYyyymmdd(date)));
			else header.push(Markup.button.callback("<", "calendar-telegram-prev-" + CalendarHelper.toYyyymmdd(date)));
		}

		header.push(Markup.button.callback(monthName + " " + year, "calendar-telegram-ignore-monthname"));

		if (this.isInMaxMonth(date)) {
			// this is max month, I push an empty button
			header.push(Markup.button.callback(" ", "calendar-telegram-ignore-maxmonth"));
		}
		else {
			if (admin) header.push(Markup.button.callback(">>", "calendar-telegram-admin-next-" + CalendarHelper.toYyyymmdd(date)));
			else header.push(Markup.button.callback(">", "calendar-telegram-next-" + CalendarHelper.toYyyymmdd(date)));
		}
		page.push(header);
		page.push(this.options.weekDayNames.map((e, i) => Markup.button.callback(e, "calendar-telegram-ignore-weekday" + i)));
	}

	addDays(page, date, fullDates, deletedDates, admin) {
		let maxMonthDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
		let maxDay = this.getMaxDay(date);
		let minDay = this.getMinDay(date);
		let backButtonRow_admin = [Markup.button.callback("🔙 Torna al menù amministratore", "calendar-telegram-admin-backmenu")]
		let backButtonRow = [Markup.button.callback("🔙 Torna al menù principale", "calendar-telegram-backmenu")];
		let currentRow = CalendarHelper.buildFillerRow("firstRow-");
		for (var d = 1; d <= maxMonthDay; d++) {
			date.setDate(d);
			let weekDay = this.normalizeWeekDay(date.getDay());
			//currentRow[weekDay] = CalendarHelper.toYyyymmdd(date);
			const isFull = (fullDates ?? []).some(fullDate => this.areDatesEqual(date, fullDate));
			const isDeleted = (deletedDates ?? []).some(deleteDate => this.areDatesEqual(date, deleteDate));
			if (admin) {
				if (d < minDay || d > maxDay || date.getDay() == 0 || isDeleted) {
					currentRow[weekDay] = Markup.button.callback(CalendarHelper.strikethroughText(d.toString()), "calendar-telegram-admin-ignore-" + CalendarHelper.toYyyymmdd(date));
				}
				else {
					currentRow[weekDay] = Markup.button.callback(d.toString(), "calendar-telegram-admin-date-" + CalendarHelper.toYyyymmdd(date));
				}
				if (weekDay == 6 || d == maxMonthDay) {
					// I'm at the end of the row: I create a new filler row
					page.push(currentRow);
					currentRow = CalendarHelper.buildFillerRow("lastRow-");
				}
			} else {
				if (d < minDay || d > maxDay || date.getDay() == 0 || isDeleted) {
					currentRow[weekDay] = Markup.button.callback(CalendarHelper.strikethroughText(d.toString()), "calendar-telegram-ignore-" + CalendarHelper.toYyyymmdd(date));
				}
				else {
					currentRow[weekDay] = Markup.button.callback(d.toString(), "calendar-telegram-date-" + CalendarHelper.toYyyymmdd(date));
				}
				if (isFull && d >= minDay) {
					currentRow[weekDay] = Markup.button.callback(CalendarHelper.lock(d.toString()), "calendar-telegram-blur-" + CalendarHelper.toYyyymmdd(date));
				}
				if (weekDay == 6 || d == maxMonthDay) {
					// I'm at the end of the row: I create a new filler row
					page.push(currentRow);
					currentRow = CalendarHelper.buildFillerRow("lastRow-");
				}
			}
		}
		if (admin) page.push(backButtonRow_admin);
		else page.push(backButtonRow);
	}
	areDatesEqual(date1, date2) {
		return date1.getFullYear() === date2.getFullYear() &&
			date1.getMonth() === date2.getMonth() &&
			date1.getDate() === date2.getDate();
	}

	getPage(inputDate, fulldate, deletedate, admin) {
		// I use a math clamp to check if the input date is in range
		let dateNumber = this.options.minDate || this.options.maxDate ? Math.min(Math.max(inputDate, this.options.minDate), this.options.maxDate) : null;
		let date = dateNumber ? new Date(dateNumber) : inputDate;

		let page = [];
		this.addHeader(page, date, admin);
		this.addDays(page, date, fulldate, deletedate, admin);
		return page;
	}

	normalizeWeekDay(weekDay) {
		let result = weekDay - this.options.startWeekDay;
		if (result < 0) result += 7;
		return result;
	}

	/**
	 * Calculates min day depending on input date and minDate in options
	 * 
	 * @param {*Date} date Test date
	 * 
	 * @returns int
	 */
	getMinDay(date) {
		let minDay;
		if (this.isInMinMonth(date)) {
			minDay = this.options.minDate.getDate();
		}
		else {
			minDay = 1;
		}

		return minDay;
	}

	/**
	 * Calculates max day depending on input date and maxDate in options
	 * 
	 * @param {*Date} date Test date
	 * 
	 * @returns int
	 */
	getMaxDay(date) {
		let maxDay;
		if (this.isInMaxMonth(date)) {
			maxDay = this.options.maxDate.getDate();
		}
		else {
			maxDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
		}

		return maxDay;
	}

	static toYyyymmdd(date) {
		let mm = date.getMonth() + 1; // getMonth() is zero-based
		let dd = date.getDate();

		return [
			date.getFullYear(),
			(mm > 9 ? '' : '0') + mm,
			(dd > 9 ? '' : '0') + dd
		].join('-');
	}

	/**
	 * Check if input date is in same year and month as min date
	 */
	isInMinMonth(date) {
		return CalendarHelper.isSameMonth(this.options.minDate, date);
	}

	/**
	 * Check if input date is in same year and month as max date
	 */
	isInMaxMonth(date) {
		return CalendarHelper.isSameMonth(this.options.maxDate, date);
	}

	/**
	 * Check if myDate is in same year and month as testDate
	 * 
	 * @param {*Date} myDate input date
	 * @param {*Date} testDate test date
	 * 
	 * @returns bool
	 */
	static isSameMonth(myDate, testDate) {
		if (!myDate) return false;
		testDate = testDate || new Date();
		return myDate.getFullYear() === testDate.getFullYear() && myDate.getMonth() === testDate.getMonth();
	}

	/**
	 * This uses unicode to draw strikethrough on text
	 * @param {*String} text text to modify
	 */
	static strikethroughText(text) {
		return text.split('').reduce(function (acc, char) {
			return acc + char + '\u0336'; 0x1D468, 0x00030
		}, '');
	}

	static lock(text) {
		return `🔐` + text;
	}

	/**
	 * Builds an array of seven ignored callback buttons
	 * @param {*object} m Telegraf Markup object
	 * @param {*String} prefix String to be added before the element index
	 */
	static buildFillerRow(prefix) {
		let buttonKey = "calendar-telegram-ignore-filler-" + prefix;
		return Array.from({ length: 7 }, (v, k) => Markup.button.callback(" ", buttonKey + k));
	}
}

module.exports = CalendarHelper;

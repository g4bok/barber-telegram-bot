class DateFormattata extends Date {
  getDataFormattata() {
    const months = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre",];
    const days = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
    return `${days[this.getDay()]} ${this.getDate()} ${months[this.getMonth()]} ${this.getFullYear()}`;
  }
}

module.exports = DateFormattata;

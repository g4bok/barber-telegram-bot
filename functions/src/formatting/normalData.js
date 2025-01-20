class NormalData extends String {
  getDate() {
    const months = [
      "Gennaio",
      "Febbraio",
      "Marzo",
      "Aprile",
      "Maggio",
      "Giugno",
      "Luglio",
      "Agosto",
      "Settembre",
      "Ottobre",
      "Novembre",
      "Dicembre",
    ];
    var stringa = this.split(" ");
    var oraEmin = stringa[5].split(":");
    let ora = parseInt(oraEmin[0]);
    let min = parseInt(oraEmin[1]);

    var data = new Date();
    data.setFullYear(stringa[3]);
    data.setMonth(months.indexOf(stringa[2]));
    data.setDate(stringa[1]);
    data.setHours(ora, min, 0);

    return data;
  }
  getOnlyDate() {
    const months = [
      "Gennaio",
      "Febbraio",
      "Marzo",
      "Aprile",
      "Maggio",
      "Giugno",
      "Luglio",
      "Agosto",
      "Settembre",
      "Ottobre",
      "Novembre",
      "Dicembre",
    ];
    var stringa = this.split(" ");
    var data = new Date(parseInt(stringa[3]), months.indexOf(stringa[2]), parseInt(stringa[1]));
    return data;
  }
}
module.exports = NormalData;

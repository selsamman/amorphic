module.exports.baseController = function (objectTemplate, getTemplate)
{

BaseController = objectTemplate.create("BaseController", {

	errorCount:         {isLocal: true, type: Number, value: 0},

	// Validators
	isName: function () {this.mustNotMatch("[^0-9A-Za-z \'\-]", "name")},
	isText: function () {this.mustNotMatch("[^\\-0-9A-Za-z !@#$%^&*()_+={}|\]\[\":;'<>?\',.]", "text")},
	isEmail: function () {
		this.mustMatch("^[^\@ ]+\@[^\@ \.]+\.[^\@ ]+", "email")
	},
	isNumeric: function () {
		this.mustNotMatch("[^0-9]", "numeric")
	},
	isPercent: function () {
		this.isNumeric();
		if(this.value && (this.value < 1 || this.value > 100))
			throw {message: "percent"}
	},
	isAlphaNumeric: function () {this.mustNotMatch("[^0-9A-Za-z]", "alphanumeric")},
	isPhone: function () {this.mustNotMatch("[^0-9 \(\)-]", "phone")},
	isSSN: function () {this.mustMatch("[0-9]{3}-[0-9]{2}-[0-9]{4}", "ssn")},
	isTaxID: function () {this.mustMatch("[0-9]{3}-[0-9]{2}-[0-9]{4}", "taxid") || this.mustMatch("[0-9]{2}-[0-9]{6}", "taxid")},
	isZip5: function () {this.mustMatch("[0-9]{5}", "zip5")},
	notEmpty: function() {
		if (!this.value || this.value.length == 0) {
			throw {message: "required"};
		}
	},
	isWithin: function(min,max) {
		if (this.value < min)
			throw {message: "min", min: min}
		if (this.value > max)
			throw {message: "max", max: max}
	},
	isWithinCurrency: function(min,max) {
		if (this.value < min)
			throw {message: "min", min: this.formatCurrencyInternal(min)}
		if (this.value > max)
			throw {message: "max", max: this.formatCurrencyInternal(max)}
	},
	isWithinPercent: function(min,max) {
		if (this.value < min / 100)
			throw {message: "min", min: min + "%"}
		if (this.value > max / 100)
			throw {message: "max", max: max + "%"}
	},
	isMinLength: function(len) {
		if (this.isEmpty() || this.value.length < len) 
			throw {message: "minlength", minlength: len}
	},
	isMaxlength: function(len) {
		if (this.isEmpty || this.value.length > len) 
			throw {message: "maxlength", maxlength: len}
	},
	isEmpty: function(value) {
		return this.value == null || this.value.length == 0
	},
	
	// Parsers
	parseCurrency: function() {
		if (!this.value) return 0;
		var n = this.value;
		n = n.replace(/k/i, '000');
		n = n.replace(/[^0-9\.\-]/g, "");
		var f = parseFloat(n);
		if (isNaN(f))
			throw {message: "currency"};
		var result = Math.floor(f * 100 + .5) / 100;
		return result;
	},
	parsePercent: function() {
		if (!this.value) return 0;
		var n = this.value;
		n = n.replace(/[^0-9\.\-]/g, "");
		var f = parseFloat(n);
		if (isNaN(f))
			throw {message: "number"};
		var result = f / 100;
		return result;
	},
	parseDate: function() {
		if (this.value == null || this.value.length == "") return null;
		var parsed = Date.parse(this.value);
		if (isNaN(parsed)) {
			throw {message: "date"}
		}
		return new Date(parsed);
	},
	parseDOB: function() {
		if (this.value == null || this.value.length == "") return null;
		var date = this.parseDate();
		var thisYear = (new Date()).getFullYear();
		var bornYear = date.getFullYear();
		if (bornYear > thisYear)
			date.setFullYear(bornYear - 100);
		if ((thisYear - bornYear    ) > 85)
			throw {message: "You must be age 85 or less"}
		return date;
	},
	parseNumber: function() {
		if (!this.value)
			return 0;
		var n = this.value;
		n = n.replace(/k/i, '000');
		n = n.replace(/[^0-9\.\-]/g, "");
		var f = parseFloat(n);
		if (isNaN(f))
			throw {message: "currency"};
		var result = f;
		return result;
	},
	
	// Formatters
	formatText: function() {
		if (this.value == null || typeof(this.value) == 'undefined') return "";
		return (this.value + "").replace(/\<.*\>/g, ' ');
	},
	formatDate: function()	{
		if (!this.value) return "";
		var date = this.value;
		return (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear();
	},
	formatDateTime: function()	{
		if (!this.value) return "";
		var date = new Date(this.value);
		return (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear() + " " +
			    date.toTimeString().replace(/ .*/, '');
	},
	formatPercent: function() {
		if(!this.value) return "";
		return Math.round(this.value * 100) + "%";
	},
	formatPercentOneDecimal: function() {
		if(!this.value) return "";
		return Math.round(this.value * 1000) / 10 + "%";
	},
	formatPercentTwoDecimal: function() {
		if(!this.value) return "";
		return Math.round(this.value * 10000) / 100 + "%";
	},
	formatPercentNS: function() {
		if(!this.value) return "";
		return Math.round(this.value * 100);
	},
	formatDollar: function(prependSymbol) {
		if(this.value == null || this.value == 0) return "";
		return this.formatCurrencyZero("$");
	},
	formatDollarRounded: function(prependSymbol) {
		if(this.value == null || this.value == 0) return "";
		this.value = Math.round(this.value);
		return this.formatCurrencyZero("$");
	},
	formatCurrency: function(prependSymbol) {
		if(this.value == null || this.value == 0) return "";
		return this.formatCurrencyZero("");
	},
	formatCurrencyZero: function(prependSymbol) {
		if(this.value == null) return "";
		return this.formatCurrencyInternal(this.value, prependSymbol);
	},
	formatCurrencyCents: function(prependSymbol) {
		if(this.value == null || this.value == 0) return "";
		return this.formatCurrencyInternal(this.value, "", true);
	},
	formatCurrencyInternal: function(value, prependSymbol, noround) {
		prependSymbol = (prependSymbol || prependSymbol == "" ? prependSymbol : "$") + "";

		if (noround)
			var n = value + "";
		else
			var n = Math.round(value) + "";

		n = n.replace(/\.([0-9])$/, ".$10");
		var p = value < 0 ? ['(', ')'] : ['', ''];
		return p[0] + prependSymbol + this.addCommas(n.replace(/-/, '')) + p[1];
	},
	formatCurrencyFree: function(prependSymbol) {
		if(this.value == null || this.value==0) return "FREE";
		if(this.value < 0) return "TBD";
		return this.formatCurrencyZero(prependSymbol);
	},
	formatRank: function () {
		if(this.value == null) return "";
		var lastDigit = (this.value + "").substr(this.value.length - 1);
		switch (lastDigit) {
			case '1': return this.value + 'st';
			case '2': return this.value + 'nd';
			case '3': return this.value + 'rd';
			default: return this.value + 'th';
		}
	},
	formatMillionBillion: function () {
		if(this.value == null) return "";
		var value = this.value.replace(/[,\$ ]/, '') * 1;
		if (value >= 1000000000)
			return this.formatCurrencyInternal(Math.round((value + 500000000) / 10000000) / 100, '$', true) + "B";
		else if (value >= 1000000)
			return this.formatCurrencyInternal(Math.round((value + 500000) / 10000) / 100, '$', true) + "M";
		else
			return this.formatCurrencyInternal(value, '$');
	},
	format100K: function () {
		if(this.value == null) return "";
		var value = (this.value + "").replace(/[,\$ ]/, '') * 1;
		if (value >= 1000000)
			return this.formatSingleDecimalInternal(Math.round(value / 100000) / 10, '$') + "m";
		else
			return this.formatSingleDecimalInternal(Math.round(value / 100) / 10, '$') + "k";
	},
	formatSingleDecimalInternal: function(value, prependSymbol) {
		prependSymbol = (prependSymbol || prependSymbol == "" ? prependSymbol : "$") + "";
		var n = Math.round(value * 10) / 10 + "";
		var p = value < 0 ? ['(', ')'] : ['', ''];
		return p[0] + prependSymbol + this.addCommas(n.replace(/-/, '')) + p[1];
	},
	formatNumber: function () {
		if(this.value == null) return "";
		return this.addCommas(this.value);
	},

    clientInit: function ()
    {
        this.attr(".currency", {format: this.formatDollar});
        this.attr(".spin", {min: "{prop.min}", max: "{prop.max}"});
        this.rule("text", {maxlength: "{prop.length}", validate: this.isText, format: this.formatText});
        this.rule("numeric", {parse: this.parseNumber, format: this.formatText});
        this.rule("name", {maxlength: "{prop.length}", validate: this.isName});
        this.rule("email", {validate: this.isEmail});
        this.rule("currency", {format:this.formatDollar, parse: this.parseCurrency});
        this.rule("currencycents", {format:this.formatCurrencyCents, parse: this.parseCurrency});
        this.rule("date", {format: this.formatDate, parse: this.parseDate});
        this.rule("datetime", {format: this.formatDateTime, parse: this.parseDate});
        this.rule("DOB", {format: this.formatDate, parse: this.parseDOB});
        this.rule("SSN", {validate: this.isSSN});
        this.rule("taxid", {validate: this.isTaxID});
        this.rule("phone", {validate: this.isPhone});
        this.rule("required", {validate: this.notEmpty});
        this.rule("percent", {validate: this.isPercent, format: this.formatPercent});
        this.rule("zip5", {validate: this.isZip5});
    },


    // Utility
	addCommas: function (nStr)	{
		nStr += '';
		x = nStr.split('.');
		x1 = x[0];
		x2 = x.length > 1 ? '.' + x[1] : '';
		var rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1' + ',' + '$2');
		}
		return x1 + x2;
	},
	mustNotMatch: function(regex, error) {
		if (this.value != null && this.value.length > 0 && (this.value + "").match(regex))
			throw error ? {message: error} : " Incorrect Format";
	},
	mustMatch: function(regex, error) {
		if (this.value != null && this.value.length > 0 && !(this.value + "").match(regex))
			throw error ? {message: error} : " Incorrect Format";
	},
	serverLog: function (text) {
		console.log(text);
		if (this.errorCount < 3)
			this.xhr("/log", "text/plain", text, this, function () {});
	},
	getModalLeft: function (dialogWidth) {
		var element = window
		var attr = 'inner';
		if (!('innerWidth' in window )) {
			attr = 'client';
			element = document.documentElement || document.body;
		}
		return Math.round(element[attr + 'Width'] / 2 - dialogWidth / 2);
	},
	getModalTop: function (dialogHeight) {
		var element = window
		var attr = 'inner';
		if (!('innerHeight' in window )) {
			attr = 'client';
			element = document.documentElement || document.body;
		}
		return Math.round(element[attr + 'Height'] / 2 - dialogHeight / 2);
	},
	show: function(target, speed) {
		$(target).slideDown(speed || 1000);
	},
	hide: function(target, speed) {
		$(target).slideUp(speed || 1000);
	},
	slideIn: function(target, speed) {
		$(target).animate({left: '0px'});
	},
	slideOut: function(target, speed) {
		$(target).animate({left: '893px'});
	},
	slideBottom: function(target, pixels, speed) {
		$(target).animate({bottom: pixels + 'px'});
	},
	fadeIn: function(target, speed) {
		$(target).fadeIn(speed || 1000);
	},
	fadeOut: function(target, speed) {
		$(target).fadeOut(speed || 1000);
	},
    /**
     * Client is to expire, either reset or let infrastructure hande it
     *
     * @return {Boolean} - true if reset handled within controller, false to destroy/create controller
     */
    clientExpire: function () {
        return false;
    },


    /**
	 * Send an XMLHTTPREQUEST for get or put
	 * @param url
	 * @param contentType
	 * @param data - will do a put if not null
	 * @param callbackobj
	 * @param callbackfn
	 */
	xhr: function (url, contentType, data, callbackobj, callbackfn, errcallbackobj, errcallbackfn)
	{
		var request = this.getxhr();
		request.open(data ? 'PUT' : 'GET', url, true);
		request.setRequestHeader("Content-type", contentType);
		var self = this;
		request.onreadystatechange = function () {
			if (request.readyState != 4)
				return;
			try {
				var status = request.status;
				var statusText = request.statusText;
			} catch (e) {
				var status = 666;
				var statusText = 'unknown';
			}
			if (status == 200) {
				self.errorCount = 0;
				callbackfn.call(callbackobj, request);
			} else {
				++self.errorCount;
				var error = "Server request failed\nurl: " + url + "\nstatus: " +  statusText + "\nmessage:" + request.responseText;
				if (errcallbackfn)
					errcallbackfn.call(errcallbackobj, request, error);
				else
					if (self.errorCount < 3)
						alert(error);
			}
		}
		request.send(data);
	},
	getxhr: function() {
		try {
			return new XMLHttpRequest();
		} catch (e) {
			try {
				return new ActiveXObject("Msxml2.XMLHTTP");
			} catch (e2) {
				try {
					return new ActiveXObject("Microsoft.XMLHTTP");
				} catch (e3) {
					throw 'No support for XMLHTTP';
				}
			}
		}
	}

});

return {
	BaseController: BaseController
}
}
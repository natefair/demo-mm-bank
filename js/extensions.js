/**
 * This is a set of javascript object extensions used to help
 * format data and manipulate dates.
 */


// US only extension
Date.Months = ['January', 'February', 'March', 'April',
               'May', 'June', 'July', 'August',
               'September', 'October', 'November', 'December'];
Date.Mos    = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
Date.DaysOfTheWeek = ['sunday', 'monday', 'tuesday',
               'wednesday', 'thursday', 'friday', 'saturday'];
Date.DOWs   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];



/**
 * addDays - move a date forward or backward by a number of days.
 *
 * @param {Number} days - an integer value
 * @return this
 */
Date.prototype.addDays = function (days) {
    if (isNaN(days)) {
        throw 'addDays: days "' + days + '" is not a number';
    }
    if (!isFinite(days)) {
        throw 'addDays: days "' + days + '" must be finite';
    }
    if (Math.floor(days) !== days) {
        throw 'addDays: days "' + days + '" must be an integer';
    }
    this.setDate(this.getDate() + days);
    return this;
};

/**
 * toShortdate - returns a date in Mon DD, YYYY format
 *
 * @return {String} - an abbreviated date form
 */
Date.prototype.toShortDate = function () {
    return Date.Mos[this.getMonth()] + ' ' + this.getDate() + ', ' + this.getFullYear();
};

/**
 * getDayOfWeek - Returns full day name for the current day.
 *
 * @return {String} - Sun, Mon, Tue, etc.
 */
Date.prototype.getDayOfWeek = function () {
    return Date.DaysOfTheWeek[this.getDay()].capitalize();
};

/**
 * getDOW - Returns short day name for the current day.
 *
 * @return {String} - Sun, Mon, Tue, etc.
 */
Date.prototype.getDOW = function () {
    return Date.DOWs[this.getDay()];
};

/**
 * getMonthLong - Returns full month name for the current month.
 *
 * @return {String} - January, February, March, etc.
 */
Date.prototype.getMonthLong = function () {
    return Date.Months[this.getMonth()];
};

/**
 * getMonthShort - Return the 3 letter representation of the
 * current month.
 *
 * @return {String} - Jan, Feb, Mar, etc.
 */
Date.prototype.getMonthShort = function () {
    return Date.Mos[this.getMonth()];
};

/**
 * Return a short date format for the given relative date.
 *
 * Relative dates can be 'today', 'tomorrow', 'the day after'
 * or a day of the week (e.g. 'Monday') and the date returned
 * will be in the future (except for 'today').
 *
 * @return {String} - a short date
 * @return null - if the relative date is not recognized
 * @see Date.toShortDate
 */
Date.parseRelative = function (date) {
    var now_msec = Date.now(),
        new_date = null,
        day_indx = -1,
        days_off = 0;

    date = date.toLowerCase();

    // Today
    if (date === 'today') {
        new_date = new Date();

    // Tomorrow
    } else if (date === 'tomorrow') {
        now_msec += (24 * 60 * 60 * 1) * 1000;
        new_date = new Date(now_msec);

    // The day after
    } else if (date === 'the day after') {
        now_msec += (24 * 60 * 60 * 2) * 1000;
        new_date = new Date(now_msec);

    } else {

        // Monday, Tuesday, etc.
        if (Date.DaysOfTheWeek.indexOf(date) !== -1) {
            day_indx = Date.DaysOfTheWeek.indexOf(date);

        // Mon, Tue, Wed
        } else if (Date.DOWs.indexOf(date) !== -1) {
            day_indx = Date.DOWs.indexOf(date);
        }

        if (day_indx !== -1) {
            new_date = new Date();
            if (day_indx < new_date.getDay()) {
                days_off = day_indx + 7 - new_date.getDay();
            } else if (day_indx > new_date.getDay()) {
                days_off = day_indx - new_date.getDay();
            } else {
                days_off = 7;
            }
            now_msec += (24 * 60 * 60 * days_off) * 1000;
            new_date = new Date(now_msec);
        }
    }

    if (new_date !== null) {
        return new_date.toShortDate();
    }

    // Error
    return null;
};

/**
 * isNumber - test a string value to see if it represents a number
 *
 * @return {Boolean} - true or false
 */
String.prototype.isNumber = function () {
    'use strict';
    return !isNaN(parseFloat(this)) && isFinite(this);
};

/**
 * formatAsCurrency - return this value as a currency string.
 *
 * @return {String} - in currency format (e.g. '14.95')
 */
Number.prototype.formatAsCurrency = function () {
    'use strict';
    var minus = (this < 0) ? '-' : '',
        str   = String(Math.floor((Math.abs(this) + 0.005) * 100) / 100);

    if (isNaN(this) || !isFinite(this)) {
        str = '0.00';
    }

    if (str.indexOf('.') < 0) {
        str = str + '.00';
    } else if (str.indexOf('.') === (str.length - 2)) {
        str = str + '0';
    }
    return minus + str;
};

/**
 * formatAsCurrency - return this value as a currency string.
 *
 * @return {String} - in currency format (e.g. '14.95')
 */
String.prototype.formatAsCurrency = function () {
    'use strict';
    var i = parseFloat(this);
    if (isNaN(i)) {
        i = 0.00;
    }
    return i.formatAsCurrency();
};

/**
 * capitalize - return this as a capitalized string.
 *
 * @return {String} - this value, capitalized.
 */
String.prototype.capitalize = function () {
    'use strict';
    return this.charAt(0).toUpperCase() + this.slice(1);
};

/**
 * toFloat - return this as a float
 *
 * @return {Float} - this value, as a float
 */
String.prototype.toFloat = function () {
    var val = this.replace(/[^\d\.-]/, '');
    val = parseFloat( val.match(/^-?\d+(\.\d+)?$/)[0] );
    if (typeof val !== 'number') {
        throw 'ERROR: "' + this + '" cannot be converted to a float value';
    }
    return val;
};

/**
 * Stringify the given value and test for a finite number value.
 *
 * @param value {Object} - candidate value to test
 * @return {Boolean}
 */
function isNumber(value) {
    return String(value).isNumber();
}

/**
 * Test a value to see if it is an array object.
 *
 * @param obj {Object} - candidate object to test
 * @return {Boolean}
 */
function isArray(obj) {
    return Object.prototype.toString.apply(obj) === '[object Array]';
}

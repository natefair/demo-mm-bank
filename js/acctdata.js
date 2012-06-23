/**
 * @class Account
 *
 * Encapsulates display formats
 *
 * @member card_prefix  - prefix to prepend to card_digits as defined by Client
 * @member card_digits  - last N digits from account number, where N is defined by Client
 * @member card_display - card_prefix + card_digits
 * @member pay_from     - "name ... {last 4 digits of number}"
 * @member pay_to       - "name card_prefix card_digits"
 *
 * @constructor
 */
var Account = function (obj) {
    $.extend(this, obj);
    this.card_prefix  = Client.card_digits_prefix;
    this.card_digits  = this.number.slice(-Client.card_show_digits);
    this.card_display = this.card_prefix + this.card_digits;
    this.pay_from     = this.name + ' ... ' + this.number.slice(-4);
    this.pay_to       = [this.name, this.card_prefix, this.card_digits].join(' ');
    this.minpmt       = this.minpmt || '20.00';
    this.balance      = this.balance || null;
};

// ----------------------------------------------------------------------------

var AccountData = AccountData || {};

// Use this BaseUrl attribute to change the global location of the data
AccountData.BaseUrl = 'data/acctdata';

// ----------------------------------------------------------------------------

/**
 * @module AccountData.Account
 *
 * Account Data Loader
 *
 * Loads mock account information.
 *
 *   AccountData.Account.initDropdown(account_number);
 *   var account_data = AccountData.Account.getData();
 *
 * account_data.fullname      => string
 * account_data.org           => string
 * account_data.emailaddrs    => array of hash {type, value, pref}
 * account_data.telephones    => array of hash {type, value, pref}
 * account_data.addresses     => array of hash {type, value, format}
 * account_data.urls          => array of hash {type, value}
 * account_data.src_accounts  => array of hash {name, routing, number}
 * account_data.dest_accounts => array of hash {name, number, balance, duedate}
 *
 */
AccountData.Account = (function ($) {
    'use strict';

    // Module's private variables
    var account_data       = null,
        active_acct_number = null,
        active_cc_number   = null,
        active_src_number  = null;

    // Module's private methods
    function make_account_json_url() {
        return AccountData.BaseUrl + '/' + active_acct_number + '.json';
    }

    /**
     * @method load_data - load the JSON from the active account number,
     * passing that data to the given callback function.
     *
     * @param callback {Function} - a setup function
     */
    function load_data(callback) {
        if (account_data === null) {
            $.getJSON(make_account_json_url(), function (results) {
               account_data = results;
               account_data.src_accounts = account_data.src_accounts.map( function (obj) {
                   return new Account(obj);
               });
               account_data.dest_accounts = account_data.dest_accounts.map( function (obj) {
                   return new Account(obj);
               });
               if (typeof callback === 'function') {
                   callback(account_data);
               }
            });
        } else if (typeof callback === 'function') {
            callback(account_data);
        }
    }

    /**
     * @method active_dest_account - return the active pay to account
     * @return {Account}
     */
    function active_dest_account() {
        //if (account_data === null) {
        //    throw 'active_dest_account: account_data is null';
        //}
        if (active_cc_number === null) {
            active_cc_number = account_data.dest_accounts[0].number;
        }
        return $.grep(account_data.dest_accounts, function (acct) {
            return acct.number === active_cc_number;
        })[0];
    }

    /**
     * @method active_src_account - return the active pay from account
     * @return {Account}
     */
    function active_src_account() {
        if (account_data === null) {
            throw 'active_src_account: account_data is null';
        }
        if (active_src_number === null) {
            active_src_number = account_data.src_accounts[0].number;
        }
        return $.grep(account_data.src_accounts, function (acct) {
            return acct.number === active_src_number;
        })[0];
    }

    // API bits
    return {
        /**
         * @method init - initialize the acctive account number
         * @param acct_number {Number}
         */
        init: function (acct_number) {
            active_acct_number = acct_number;
        },

        /**
         * @method activeAcctNumber - return the active account number
         * @return {Number}
         */
        activeAcctNumber: function () {
            return active_acct_number;
        },

        /**
         * @method initDropdown - load the account data, if it hasn't
         * been loaded already, and pass the given parameters and account
         * data to the display_callback.
         *
         * @param display_callback {Function} - called with the rest of the
         * parameters as arguments, along with the account data.
         * @param div {String} - div parameter for display_callback
         * @param disabled {Boolean} - disabled parameter for display_callback
         * @param setup_callback {Function} - setup_callback parameter for display_callback
         *
         * "display_callback" can be used to display the resulting data where:
         *  - "div" defines the div ID where the setup should occur,
         *  - "disabled" defines if the dropdown is disabled, and
         *  - "setup_callback" is used to define event callbacks.
         */
        initDropdown: function (display_callback, div, disabled, setup_callback) {
            load_data(function (account_data) {
                if (typeof display_callback === 'function') {
                    display_callback(account_data, div, disabled, setup_callback);
                }
            });
        },

        /**
         * @method getData - return the account data
         * @return {Object}
         */
        getData: function () {
            return account_data;
        },

        // CC accounts

        /**
         * @method setActiveCcNumber - set the active pay to account number
         * @param newval {String} - the new number
         */
        setActiveCcNumber: function (newval) {
            active_cc_number = newval;
        },

        /**
         * @method activeCcNumber - return the active pay to accountnumber
         * @return {String}
         */
        activeCcNumber: function () {
            return active_cc_number;
        },

        /**
         * @method getDestAccount - return the active pay to account
         * @return {Account}
         */
        getDestAccount: active_dest_account,

        /**
         * @method getDestAccountName - return the active pay to account name
         * @return {String}
         */
        getDestAccountName: function () {
            return active_dest_account().name;
        },

        /**
         * @method getDestAccountBalance - return the active pay to account balance
         * @return {String}
         */
        getCurrentBalance: function () {
            return active_dest_account().balance;
        },

        /**
         * @method getPayTo - return the active pay to account display value
         * @return {String}
         */
        getPayTo: function () {
            return active_dest_account().pay_to;
        },

        /**
         * @method getMinimumPayment - return the active pay to account minimum payment
         * @return {String}
         */
        getMinimumPayment: function () {
            return active_dest_account().minpmt;
        },

        // Bank accounts

        /**
         * @method setActiveSrcNumber - set the active pay from account number
         * @param newval {String} - the new number
         */
        setActiveSrcNumber: function (newval) {
            active_src_number = newval;
        },

        /**
         * @method activeSrcNumber - return the active pay from account number
         * @return {String}
         */
        activeSrcNumber: function () {
            return active_src_number;
        },

        /**
         * @method getSrcAccount - return the active pay from account
         * @return {Account}
         */
        getSrcAccount: active_src_account,

        /**
         * @method getPayFrom
         *
         * @return {String} the display version of the pay_from account
         */
        getPayFrom: function () {
            return active_src_account().pay_from;
        },

        /**
         * @method addSrcAccount - add a new source (pay from) account
         *
         * @param name    {String} - the name of the account
         * @param routing {String} - the routing number of the account
         * @param number  {String} - the account number
         */
        addSrcAccount: function (name, routing, number) {
            this.src_accounts.push(new Account({
                name:    name,
                routing: routing,
                number:  number
            }));
        }
    };
})(jQuery);


// ----------------------------------------------------------------------------

/**
 * @module AccountData.Transactions
 *
 * Account Transaction Loader
 *
 * Loads mock transaction data for a given CC number.
 *
 * @method display (cc_number[, callback])
 * @method setDisplayCallback (callback)
 * @method displayTransactions (data)
 * @method getData ()
 * @method getMerchants ()
 *
 * @example
 *   AccountData.Transactions.setDisplayCallback(my_display_fn)
 *   AccountData.Transactions.display(cc_number);
 *   var data = AccountData.Transactions.getData();
 *   for (var i = 0; i < data.transactions.length; i += 1) {
 *       ...
 *   }
 *
 * transactionData.transactions => array of Transaction {
 *   id,
 *   name, address, city, state, zipcode,
 *   amount,
 *   dow, day, month, year, time, zone
 * }
 */
AccountData.Transactions = (function ($) {
    var data             = null,
        active_cc_number = null,
        display_callback = function () {
            alert('Display callback not set. Use setDisplayCallback.');
        },
        onload_callback  = null;

    // Return the URL for fetching the CC transaction information
    function make_cc_transactions_url() {
        return AccountData.BaseUrl + '/transactions-' +
               active_cc_number + '.json';
    }

    function display_transactions(data) {
        display_callback(data);
    }

    function get_data() {
        if (active_cc_number !== null && typeof data[active_cc_number] !== 'undefined') {
            return data[active_cc_number];
        }
        return { transactions: [] };
    }

    function show_transactions(data, callback) {
        display_transactions(data);
        if (typeof callback === 'function') {
            callback(data);
        }
        if (typeof onload_callback === 'function') {
            onload_callback();
            onload_callback = null;
        }
    }

    function load_cc_data(cc_number, callback) {
        $.getJSON(make_cc_transactions_url(cc_number), function (results) {
            data[cc_number] = {
                transactions: results.transactions.map(function (obj) {
                    return new Transaction(obj);
                })
            };
            show_transactions(data[cc_number], callback);
        });
    }

    return {
        /**
         * @method setOnLoadCallback - set a on-time callback when
         * transactions are loaded.
         *
         * @param callback {Function} - a function which takes no params.
         */
        setOnLoadCallback: function (callback) {
            if (data === null) {
                onload_callback = callback;
            } else if (typeof callback === 'function') {
                callback();
            }
        },

        /**
         * @method display - load and display transactions for the given
         * CC number and apply the optional callback to the data.
         *
         * @param cc_number {String} - the CC number
         * @param callback {Function} - OPTIONAL function to apply to the
         * transactions data after they have been displayed.  This callback
         * should have a signature of "function (data)" and "data" is an
         * object with a "transactions" attribute, which is an array of
         * Transaction objects.
         */
        display: function (cc_number, callback) {
            active_cc_number = cc_number
            data = data || {};
            if (data[active_cc_number] === undefined) {
                load_cc_data(cc_number, callback);
            } else {
                show_transactions(data[cc_number], callback);
            }
        },

        /**
         * @method setDisplayCallback - set the function used to display
         * the list of transactions.
         *
         * @param callback {Function} - function to display the list of
         * transactions.  This callback should have a signature of
         * "function (data)" and "data" is an object with a "transactions"
         * attribute, which is an array of Transaction objects.
         */
        setDisplayCallback: function (callback) {
            display_callback = callback;
        },

        /**
         * @method displayTransactions - display the list of transactions.
         *
         * @param data - an object with a "transactions" attribute, which
         * is an array of Transaction objects.
         */
        displayTransactions: display_transactions,

        /**
         * @method getData - get the transaction data for the current CC number.
         *
         * @return {Object} data has a "transactions" attribute, which is
         * an array of Transaction objects.
         */
        getData: get_data,

        /**
         * @method getTransactions - return a new array of the transactions
         */
        getTransactions: function () {
            return get_data().transactions.map(function (o) { return o; });
        },

        /**
         * @method getMerchants - return a sorted list of merchants from the
         * list of transactions.
         *
         * @return {Array} a sorted list of unique merchant names
         */
        getMerchants: function () {
            return $.unique(get_data().transactions.map(function (transaction) {
                return AccountData.Utils.merchantDecode(transaction.merchant);
            }).sort()).sort();
        }
     };
}(jQuery));



// ----------------------------------------------------------------------------

/**
 * @module AccountData.Utils
 *
 * Utility functions for date, time and name manipulation.
 *
 * @method timestampToObject(millis)
 * @method transactionDate(transaction)
 * @method transactionDateObject(transaction)
 * @method merchantDecode(merchant)
 * @method dateDue(datedue)
 * @method dateDueDatebox(datedue)
 */
AccountData.Utils = (function ($) {

    /**
     * @method two_digit_string - returns a number as a 2 digit,
     * zero-padded string.
     * @return {String}
     */
    function two_digit_string(num) {
        return (num < 10) ? '0' + num : '' + num;
    };

    function timestamp_to_object(timestamp) {
        var date = new Date(timestamp),
            hour = two_digit_string(date.getHours()),
            mins = two_digit_string(date.getMinutes()),
            secs = two_digit_string(date.getSeconds()),
            time = [hour, mins, secs].join(':');

        return {
            day:      date.getDate(),
            dow:      date.getDOW(),
            month:    date.getMonthShort(),
            year:     date.getFullYear(),
            mm:       two_digit_string(date.getMonth() + 1),
            dd:       two_digit_string(date.getDate()),
            hhmmss:   time,
            hours:    hour,
            minutes:  mins,
            seconds:  secs
        };
    };

    var transaction_date = function (transaction) {
        var day_millis = 24 * 60 * 60 * 1000;
        if (transaction['timestamp'] !== undefined) {
            return transaction.timestamp;
        }
        if (transaction['daysago'] !== undefined) {
            var now = new Date();
            var hrs = transaction.time.match(/\d+/g).map(function (a) {return a - 0});
            now.setHours(hrs[0], hrs[1]);
            var xtm = new Date(now.getTime() - transaction.daysago * day_millis);
            transaction.timestamp = xtm.getTime();
            return transaction.timestamp;
        }
        if (transaction['dow'] !== undefined) {
            transaction.timestamp = Date.parse(
                transaction.dow   + ' ' +
                transaction.month + ' ' +
                transaction.day   + ' ' +
                transaction.year  + ' ' +
                transaction.time  + ' ' +
                transaction.zone);
            return transaction.timestamp;
        }
        return -1; // Error in transaction object
    };


    /**
     * @method parse_due_date - parse a date in either in a format
     * suitable for Date.parse, or as an offset in days from today.
     *
     * @param datedue {String} - either a day-offset or date
     * @return {Number} the due date in milliseconds
     */
    function parse_due_date(datedue) {
        var tstamp = 0;
        if (datedue.match(/^-?\d+$/)) {
            tstamp = $.now() + (parseFloat(datedue) * 24 * 60 * 60 * 1000) * -1;
        } else {
            tstamp = Date.parse(datedue);
        }
        return tstamp;
    };

    return {
        /**
         * @method timestampToObject - Convert milliseconds into
         * displayable date attributes.
         *
         * @param timestamp {Number} - time in millis
         * @return {Object} day, dow, month, year, mm, dd, hhmmss,
         *                  hours, minutes, seconds attributes
         *
         * @example
         *  var millis = $.now();
         *  var dt_obj = AccountData.Utils.timestampToObject(millis);
         */
        timestampToObject: timestamp_to_object,

        /**
         * @method transactionDate - convert 'daysago' or [dow, month, day,
         * year, time, zone] into a timestamp (in milliseconds). Returns -1
         * if timestamp cannot be created.  Updates transaction object with
         * 'timestamp' attribute.
         *
         * @param transaction {Transaction} - a transaction object from JSON
         * @return {Number} timestamp in milliseconds
         */
        transactionDate: transaction_date,

        /**
	 * @method transactionDateObject - return a date object for
         * the given transaction
	 *
	 * @param transaction - a transaction object from JSON
	 * @return object - day, dow, month, year attributes
	 *
         */
        transactionDateObject: function (transaction) {
            return timestamp_to_object(transaction_date(transaction));
        },

        /**
         * @method merchantDecode - return an HTML encoded value as regular text.
         *
         * @param value {String} - string with posible number of HTML entities
         * @return {String} the string with HTML entities decoded
         */
        merchantDecode: function (value) {
            return $('<div>').html(value).text();
        },

        /**
         * @method dateDue - return a due date in "Month Day, Year"
         * format.
         *
         * @param datedue  - a string of either a day-offset or date
         * @return due_date - a string like 'Jan 1, 1970'
         */
        dateDue: function (datedue) {
            var obj = timestamp_to_object(parse_due_date(datedue));
            return obj.month + ' ' + obj.day + ', ' + obj.year;
        },

        /**
         * @method dateDueDatebox - return a date suitable for using
         * with the jQuery mobile datebox plugin
         *
         * @param datedue  - a string of either a day-offset or date
         * @return due_date - a string like '1970-01-01'
         */
        dateDueDatebox: function (datedue) {
            var obj = timestamp_to_object(parse_due_date(datedue));
            return obj.year + '-' + obj.mm + '-' + obj.dd;
        }
    };
})(jQuery);

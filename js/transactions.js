/**
 * @class Transaction
 *
 * Encapsulates Date display formats
 * Encapsulates Location display formats
 *
 * @constructor
 */
var Transaction = function(obj) {
    $.extend(this, obj);
    var date_obj = AccountData.Utils.transactionDateObject(this);
    $.extend(this, date_obj);
    this.merchant = obj.name;
};

Transaction.prototype = (function ($) {
    return {
        /**
         * @method locationShort
         * @return "City, ST"
         */
        locationShort: function () {
            if (this['_location_short'] === undefined) {
                var parts = [];
                if (this.city.length > 0) {
                    parts.push(this.city);
                }
                if (this.state.length > 0) {
                    parts.push(this.state);
                }
                this._location_short = parts.join(', ');
            }
            return this._location_short;
        },

        /**
         * @method location
         * @return "City, ST Zipcode"
         */
        location: function () {
            if (this['_location_full'] === undefined) {
                var parts = [];
                var short = this.locationShort();
                if (short.length > 0) {
                    parts.push(short);
                }
                if (this.zipcode.length > 0) {
                    parts.push(this.zipcode);
                }
                this._location_full = parts.join(' ');
            }
            return this._location_full;
        },

        /**
         * @method fullAddress
         * @return "Address, City, ST Zipcode"
         */
        fullAddress: function () {
            if (this['_full_addr'] === undefined) {
                this._full_addr = this.address + ', ' + this.location();
            }
            return this._full_addr;
        },

        /**
         * @method htmlAddress
         * @return "Address<br />City, ST Zipcode"
         */
        htmlAddress: function (delim) {
            delim = delim || '<br />';
            if (this.address.length === 0) {
                return this.location();
            }
            return this.address + delim + this.location();
        },

        /**
         * @method dowMonth
         * @return "DOW, Month"
         */
        dowMonth: function () {
            if (this['_dow_mon'] === undefined) {
                this._dow_mon = this.dow   + ', ' + this.month;
            }
            return this._dow_mon;
        },

        /**
         * @method fullDate
         * @return "DOW, Month Day, Year Time Zone"
         */
        fullDate: function () {
            if (this['_full_date'] === undefined) {
                this._full_date = this.dowMonth() + ' ' +
                                  this.day   + ', ' +
                                  this.year  + ' ' +
                                  this.time  + ' ' +
                                  this.zone;
            }
            return this._full_date;
        },

        /**
         * @method isPayment
         * @return {Boolean} true if this transaction is a payment.
         */
        isPayment: function () {
            if (this['_is_payment'] === undefined) {
                this._is_payment = this.name.match(/^payment$/i) !== null;
            }
            return this._is_payment;
        },

        /**
         * @method payment
         * @return {String} the monetary amount for this transaction.
         */
        payment: function () {
            if (this.isPayment()) {
                return this.amount.replace('-', '');
            }
            return this.amount;
        }
    }
}(jQuery));


/**
 * @class TransactionFilter
 *
 * This is a filter state singleton object more than a module.
 */
var TransactionFilter = (function () {
    return {
        amount:   [],
        date:     [],
        merchant: [],
        sort:     [],
        count:     0,

        /**
         * @method updateFilter - add a filter value to a filter type
         * @param type {String} - one of: amount, date, merchant, sort
         * @param value {String} the filter value
         * @return the new count of filter or -1 if type is not valid
         */
        updateFilter: function (type, value) {
            if (isArray(this[type]) && isArray(value)) {
                var old_len = this[type].length,
                    new_len = value.length;
                this[type]  = value;
                this.count += new_len - old_len;
                return this.count;
            }
            return -1;
        },

        /**
         * @method addAmountFilter - add a less/greater than amount filter
         * @param value {String} - the value limit
         * @param direction {String} - 'greater than', 'less than', 'equal to', etc.
         */
        addAmountFilter: function (value, direction) {
            return this.updateFilter('amount', [value, direction]);
        },

        /**
         * @method addDateFilter - add a less/greater than date filter
         * @param value {String} - the value limit
         * @param direction {String} - 'greater than', 'less than', 'equal to', etc.
         */
        addDateFilter: function (value, direction) {
            return this.updateFilter('date', [value, direction]);
        },

        /**
         * @method addMerchantFilter - add an exact match filter to merchants
         * @param value {String} - the merchant match value
         */
        addMerchantFilter: function (value) {
            return this.updateFilter('merchant', [value]);
        },

        /**
         * @method addSortFilter - add a 'sort by' filter
         * @param value {String} - one of: 'date', 'amount', 'merchant'
         * @param direction {String} - 'asc', 'desc', etc.
         */
        addSortFilter: function (value, direction) {
            return this.updateFilter('sort', [value, direction]);
        },

        /**
         * @method removeFilter - remove all the filters for the given type
         * @param type {String} - one of: amount, date, merchant, sort
         * @return the number of filters removed
         */
        removeFilter: function (type) {
            if (isArray(this[type])) {
                var old_len = this[type].length;
                this[type]  = [];
                this.count -= old_len;
                return old_len;
            }
            return 0;
        },

        /**
         * @method clearFilters - clear all filter information
         * @return the number of filters cleared
         */
        clearFilters: function () {
            var prev_count = this.count;
            this.amount   = [];
            this.date     = [];
            this.sort     = [];
            this.merchant = [];
            this.count    = 0;
            return prev_count - this.count;
        }
    };
}());


// MODULE: TransactionList
var TransactionList = (function($) {
    var cc_num  = null;
    var data    = null;
    var cur_idx = 0;
    var filters = TransactionFilter;
    var button_callback = null;


    function get_data() {
        if (data === null) {
            try {
                BankDemo.log('reloading data');
                data = {
                    transactions: AccountData.Transactions.getTransactions()
                };
                apply_filters();
            } catch(error) {
                throw 'ERROR in get_data(): ' + error;
            }
        }
        return data;
    }


    function length() {
        return get_data().transactions.length;
    }


    // Conver HTML into text and return a list of possible values
    function merchant_decode(value) {
        var text = $('<div/>').html(value).text().toLowerCase(),
            list = [text];
        if (text.match(/ & /)) {
            list.push( text.replace(/ & /g, ' and ') );
        }
        return list;
    }


    function date_value_to_timestamp(value) {
        if (typeof value === 'number') {
            return value;
        }
        // Wed Jan 15 2012
        if (value.match(/^(:?[SMTWF]\w\w\w? )?[JFMASOND][a-z]{2} \d\d? \d{4}$/)) {
            return Date.parse(value);
        }
        // Wed Jan 15
        if (value.match(/^(:?[SMTWF]\w\w\w? )?[JFMASOND][a-z]{2} \d\d?$/)) {
            var val = value + ' ' + ((new Date()).getYear() + 1900);
            return Date.parse(val);
        }
        // Millis as string
        if (value.match(/^\d+$/)) {
            return parseFloat(value);
        }
        return -1;
    }


    function filter_by_date(value, direction) {
        var list = [];
        value = date_value_to_timestamp(value);

        switch (direction) {
        case 'since':
        case 'after':
            list = $.grep(get_data().transactions, function(transaction) {
                return transaction_date(transaction) >= value;
            });
            break;

        case 'prior to':
        case 'before':
            list = $.grep(get_data().transactions, function(transaction) {
                return transaction_date(transaction) < value;
            });
            break;

        case 'on':
        default:
            var days_end = value + 24 * 60 * 60 * 1000;
            list = $.grep(get_data().transactions, function(transaction) {
                var trans_date = transaction_date(transaction);
                return (trans_date >= value) && (trans_date < days_end);
            });
            break;
        }
        get_data().transactions = list;
    }

    function filter_by_amount(value, direction) {
        var list = [];
        value = value.toFloat();

        switch (direction) {
        case 'over':
        case 'more than':
        case 'greater than':
            list = $.grep(get_data().transactions, function(transaction) {
                return transaction.amount.toFloat() > value;
            });
            break;

        case 'under':
        case 'less than':
            list = $.grep(get_data().transactions, function(transaction) {
                return transaction.amount.toFloat() < value;
            });
            break;

        case 'about':
        case 'around':
            var upper_limit = value + 0.50;
            var lower_limit = value - 0.50;
            list = $.grep(get_data().transactions, function(transaction) {
                var amount = transaction.amount.toFloat();
                return amount > lower_limit && amount < upper_limit;
            });
            break;

        case 'exactly':
        default:
            list = $.grep(get_data().transactions, function(transaction) {
                return transaction.amount.toFloat() === value;
            });
            break;
        }

        get_data().transactions = list;
    }

    function filter_by_merchant(value) {
        var what = value.toLowerCase();
        var list = $.grep(get_data().transactions, function(transaction) {
            var candidates = merchant_decode(transaction.name);
            return $.inArray(what, candidates) >= 0;
        });
        get_data().transactions = list;
    }


    // Amount sorting functions

    function amount_sort_up(a, b) {
        return a.amount.toFloat() - b.amount.toFloat();
    }

    function amount_sort_down(a, b) {
        return b.amount.toFloat() - a.amount.toFloat();
    }

    // Merchant sorting functions

    function string_cmp(a, b) {
        if (a > b) {
            return 1;
        } else if (b > a) {
            return -1;
        }
        return 0;
    }

    function merchant_sort_up(a, b) {
        return string_cmp(a.name, b.name);
    }

    function merchant_sort_down(a, b) {
        return string_cmp(b.name, a.name);
    }

    // Date sorting functions

    function transaction_date(transaction) {
        return AccountData.Utils.transactionDate(transaction);
    }

    function date_sort_up(a, b) {
        return transaction_date(a) - transaction_date(b);
    }

    function date_sort_down(a, b) {
        return transaction_date(b) - transaction_date(a);
    }


    function sort_by(column, direction) {
        var callback;
        var desc = direction === 'desc';
        switch (column) {
        case 'amount':
            callback = desc ? amount_sort_down : amount_sort_up;
            break;
        case 'date':
            callback = desc ? date_sort_down : date_sort_up;
            break;
        case 'merchant':
            callback = desc ? merchant_sort_down : merchant_sort_up;
            break;
        }
        get_data().transactions.sort(callback);
    }


    function refresh_list() {
        AccountData.Transactions.displayTransactions(get_data());
        return length();
    }

    function apply_filters() {
        BankDemo.log('applying filters...');
        if (filters.date.length > 0) {
            BankDemo.log('apply_filters: filter by date: ' + JSON.stringify(filters.date));
            filter_by_date( filters.date[0], filters.date[1] );
        }
        if (filters.merchant.length > 0) {
            BankDemo.log('apply_filters: filter by merchant: ' + JSON.stringify(filters.merchant));
            filter_by_merchant(filters.merchant[0]);
        }
        if (filters.amount.length > 0) {
            BankDemo.log('apply_filters: filter by amount: ' + JSON.stringify(filters.amount));
            filter_by_amount(filters.amount[0], filters.amount[1]);
        }
        if (filters.sort.length > 0) {
            BankDemo.log('apply_filters: sort: ' + JSON.stringify(filters.sort));
            sort_by(filters.sort[0], filters.sort[1]);
        }
        return refresh_list();
    }


    return {
        /**
         * @method init - display the transaction list
         */
        init: function (callback) {
            data   = null;
            cc_num = AccountData.Account.activeCcNumber();

            AccountData.Transactions.display(cc_num, function(data) {
                if (typeof callback === 'function') {
                    callback(data);
                }
                get_data();
            });
        },


        /**
         * @method filterByDate - filter the transaction array by date
         *
         * @param value     {Number} a date value in milliseconds
         * @param direction {String} 'since', 'after',
         *                           'prior to', 'before' or 'on'
         */
        filterByDate: function (value, direction) {
            filters.addDateFilter(value, direction);
            data = null;
            get_data();
        },


        /**
         * @method filterByAmount - filter the transaction array by amount
         *
         * @param value     {Number} a numeric value
         * @param direction {String} 'over', 'greater than',
         *                           'under', 'less than'
         *                           'about', 'around' or 'exactly'
         */
        filterByAmount: function (value, direction) {
            filters.addAmountFilter(value, direction);
            data = null;
            get_data();
        },

        /**
         * @method filterByMerchant - filter the transaction array by merchant name
         *
         * @param value {String} a merchant name
         */
        filterByMerchant: function (value) {
            filters.addMerchantFilter(value);
            data = null;
            get_data();
        },

        /**
         * @method sort - sort by a specified column and direction
         *
         * @param value     {String} one of 'amount', 'date', or 'merchant'
         * @param direction {String} 'asc' or 'desc'
         */
        sort: function (column, direction) {
            filters.addSortFilter(column, direction);
            data = null;
            get_data();
        },

        /**
         * @method removeFilter - remove a filter of a specified type
         *
         * @param type {Sting} one of 'amoun', 'date', 'merchant', or 'sort'
         */
        removeFilter: function (type) {
            if (filters.removeFilter(type) > 0) {
                data = null;
                get_data();
            }
        },

        /**
         * @method clearFilters - remove all transaction filters
         */
        clearFilters: function () {
            if (filters.clearFilters() > 0) {
                data = null;
                get_data();
            }
        },

        /**
         * @method filter - return the TransactionFilter object
         */
        filters: function() {
            return filters;
        },

        /**
         * @method getData - return the transaction data
         */
        getData: get_data,

        /**
         * @method setFilterButtonCallback - set a callback for each
         * filter "cancel" button.
         */

        /**
         * @method currentIndex - return the internal index state
         * used by next() and prev().
         *
         * @return {Number} the internal index
         */
        currentIndex: function() {
            return cur_idx;
        },

        /**
         * @method get - return the transaction at the given index within
         * the transaction array.
         *
         * @param idx {Number} - an index within the transaction array
         * @return {Transaction}
         */
        get:  function(idx) {
            idx = idx || cur_idx;
            idx = parseFloat(idx);
            get_data();
            if (idx < 0) { idx = 0; }
            if (idx >= data.transactions.length) {
                idx = data.transactions.length - 1;
            }
            cur_idx = idx;
            return data.transactions[idx];
        },

        /**
         * @method prev - return the previous transaction
         */
        prev: function() {
            if (cur_idx > 0) {
                cur_idx = cur_idx - 1;
            }
            return get_data().transactions[cur_idx];
        },

        /**
         * @method next - return the next transaction
         */
        next: function() {
            if (cur_idx < get_data().transactions.length - 1) {
                cur_idx = cur_idx + 1;
            }
            return get_data().transactions[cur_idx];
        },

        /**
         * @method findFirst - given a vendor name, return the index for
         * the first transaction record.
         *
         * @param name {String} - a vendor name
         * @return {Number}     - the index of the transaction or -1 if not found
         */
        findFirst: function(name) {
            get_data();
            var trans_idx = -1;
            for (var i = 0; i < data.transactions.length; i += 1) {
                if (data.transactions[i].name.toLowerCase() === name.toLowerCase()) {
                    trans_idx = i;
                    break;
                }
            }
            return trans_idx;
        },

        /**
         * @method getMerchants - return a delimited string of merchant names.
         *
         * @param delim {String} - delimiter
         * @return {String}      - delimited string of merchant names
         */
        getMerchants: function(delim) {
            get_data();
            var merchants = '';
            var merchantHash = new Object();
            for (var i = 0; i < data.transactions.length; i += 1) {
                var merchant = data.transactions[i].name;
                if (i == 0 || merchantHash[merchant] == undefined) {
                    merchantHash[merchant] = merchant;
                    if (i > 0) {
                        merchants += delim;
                    }
                    merchants += merchant;
                }
            }
            return merchants;
        }
    };
})(jQuery);

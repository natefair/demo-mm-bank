// MODEL: Transaction
//
// Encapsulates Date display formats
// Encapsulates Location display formats
var Transaction = function(obj) {
    $.extend(this, obj);
    var date_obj = AccountData.Utils.transactionDateObject(this);
    $.extend(this, date_obj);
    this.merchant = obj.name;
};

Transaction.prototype = (function ($) {
    return {
        // Return "City, ST"
        locationShort: function() {
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

        // Return "City, ST Zipcode"
        location: function() {
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

        // Return "Address, City, ST Zipcode"
        fullAddress: function() {
            if (this['_full_addr'] === undefined) {
                this._full_addr = this.address + ', ' + this.location();
            }
            return this._full_addr;
        },

        dowMonth: function() {
            if (this['_dow_mon'] === undefined) {
                this._dow_mon = this.dow   + ', ' + this.month;
            }
            return this._dow_mon;
        },

        fullDate: function() {
            if (this['_full_date'] === undefined) {
                this._full_date = this.dowMonth() + ' ' +
                                  this.day   + ', ' +
                                  this.year  + ' ' +
                                  this.time  + ' ' +
                                  this.zone;
            }
            return this._full_date;
        },

        isPayment: function() {
            if (this['_is_payment'] === undefined) {
                this._is_payment = this.name.match(/^payment$/i) !== null;
            }
            return this._is_payment;
        },

        payment: function() {
            if (this.isPayment()) {
                return this.amount.replace('-', '');
            }
            return this.amount;
        }
    }
}(jQuery));


var TransactionFilter = (function () {
    var is_array = function (obj) {
        return Object.prototype.toString.apply(obj) === '[object Array]';
    };

    return {
        amount:   [],
        date:     [],
        merchant: [],
        sort:     [],
        count:     0,
        update_filter: function (type, value) {
            if (is_array(this[type]) && is_array(value)) {
                var old_len = this[type].length,
                    new_len = value.length;
                this[type]  = value;
                this.count += new_len - old_len;
                return this.count;
            }
            return -1;
        },
        addAmountFilter: function (value, direction) {
            return this.update_filter('amount', [value, direction]);
        },
        addDateFilter: function (value, direction) {
            return this.update_filter('date', [value, direction]);
        },
        addMerchantFilter: function (value) {
            return this.update_filter('merchant', [value]);
        },
        addSortFilter: function (value, direction) {
            return this.update_filter('sort', [value, direction]);
        },
        removeFilter: function (type) {
            if (is_array(this[type])) {
                var old_len = this[type].length;
                this[type]  = [];
                this.count -= old_len;
                return old_len;
            }
            return 0;
        },
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

/*
    var filters = {
        'date':     [],
        'merchant': [],
        'amount':   [],
        'sort':     []
    };
*/


    var init = function(callback) {
        data    = null;
        cc_num  = AccountData.account.active_cc_number();

        AccountData.transactions.display(cc_num, function(data) {
            if (typeof callback === 'function') {
                callback(data);
            }
            getData();
        });
    };


    var getData = function() {
      if (data === null || data === undefined) {
          try {
              BankDemo.log('TransactionList.getData: loading data, calling apply_filters');
              var list = AccountData.transactions.getData().transactions;
              data = { transactions: list.map(function(obj) { return obj; }) };
              apply_filters();
          } catch(err) {
              BankDemo.log(err);
          }
      }
      return data;
    };


    var length = function() {
        return getData().transactions.length;
    };

    var amount_to_float = function(value) {
        return parseFloat( value.match(/-?\d+(\.\d+)?$/)[0] );
    };


    // Conver HTML into text and return a list of possible values
    var merchant_decode = function(value) {
        var text = $('<div/>').html(value).text().toLowerCase();
        var list = [text];
        if (text.match(/ & /)) {
            list.push( text.replace(/ & /g, ' and ') );
        }
        return list;
    };

    var date_value_to_timestamp = function(value) {
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
    };


    var _filter_by_date = function(value, direction) {
        var list = [];
        value = date_value_to_timestamp(value);

        switch (direction) {
        case 'since':
        case 'after':
            list = $.grep(getData().transactions, function(transaction) {
                return transaction_date(transaction) >= value;
            });
            break;

        case 'prior to':
        case 'before':
            list = $.grep(getData().transactions, function(transaction) {
                return transaction_date(transaction) < value;
            });
            break;

        case 'on':
        default:
            var days_end = value + 24 * 60 * 60 * 1000;
            list = $.grep(getData().transactions, function(transaction) {
                var trans_date = transaction_date(transaction);
                return (trans_date >= value) && (trans_date < days_end);
            });
            break;
        }
        getData().transactions = list;
    };


    var refresh_list = function() {
        BankDemo.log('TransactionList.refresh_list');
        var now = Date.now();
        AccountData.transactions.displayTransactions(getData());
        BankDemo.log('TransactionList.refresh_list took ' + (Date.now() - now) + ' ms');
        return length();
    };


    var date_filter_label = function(value, direction) {
        var str = '';
        if (typeof value === 'number') {
            var date = AccountData.Utils.timestampToObject(value);
            str = date.month + ' ' + date.day;
        } else {
            str = value.match(/[JFMASOND][a-z]{2} \d+/)[0];
        }
        if (direction !== undefined && direction.length > 0) {
            return direction.capitalize() + ' ' + str;
        }
        return str;
    };

    /**
     * Filter by date
     *
     * @param value     {Number} a date value in milliseconds
     * @param direction {String} 'after' or 'before'
     */
    var filter_by_date = function(value, direction) {
        //filters['date'] = [value, direction];
        filters.addDateFilter(value, direction);
        add_filter_cancel_button('date', date_filter_label(value, direction));
        _filter_by_date(value, direction);
        return refresh_list();
    };


    var _filter_by_amount = function(value, direction) {
        var list = [];
        value = amount_to_float(value);

        switch (direction) {
        case 'over':
        case 'greater than':
            list = $.grep(getData().transactions, function(transaction) {
                return amount_to_float(transaction.amount) > value;
            });
            break;

        case 'under':
        case 'less than':
            list = $.grep(getData().transactions, function(transaction) {
                return amount_to_float(transaction.amount) < value;
            });
            break;

        case 'about':
        case 'around':
            var upper_limit = value + 0.50;
            var lower_limit = value - 0.50;
            list = $.grep(getData().transactions, function(transaction) {
                var amount = amount_to_float(transaction.amount);
                return amount > lower_limit && amount < upper_limit;
            });
            break;

        case 'exactly':
        default:
            list = $.grep(getData().transactions, function(transaction) {
                return amount_to_float(transaction.amount) == value;
            });
            break;
        }

        getData().transactions = list;
    };


    // Filter by amount
    //
    // @param value      a numeric value
    // @param direction  'greater than' or 'less than'
    //
    var filter_by_amount = function(value, direction) {
        //filters['amount'] = [value, direction];
        filters.addAmountFilter(value, direction);
        var label = [capitalize(direction), value].join(' ');
        add_filter_cancel_button('amount', label);
        _filter_by_amount(value, direction);
        return refresh_list();
    };


    var _filter_by_merchant = function(value) {
        var what = value.toLowerCase();
        var list = $.grep(getData().transactions, function(transaction) {
            var candidates = merchant_decode(transaction.name);
            return $.inArray(what, candidates) >= 0;
        });
        getData().transactions = list;
    };


    // Filter by merchant name
    //
    // @param value   a string value
    //
    var filter_by_merchant = function(value) {
        //filters['merchant'] = [value];
        filters.addMerchantFilter(value);
        add_filter_cancel_button('merchant', value);
        _filter_by_merchant(value);
        return refresh_list();
    };


    var transaction_date = function(transaction) {
        return AccountData.Utils.transactionDate(transaction);
    };

    // sorting functions
    var amount_sort_up = function(a, b) {
        return amount_to_float(a.amount) - amount_to_float(b.amount);
    };

    var amount_sort_down = function(a, b) {
        return amount_to_float(b.amount) - amount_to_float(a.amount);
    };

    var string_cmp = function(a, b) {
        if (a > b) {
            return 1;
        } else if (b > a) {
            return -1;
        }
        return 0;
    };

    var merchant_sort_up = function(a, b) {
        return string_cmp(a.name, b.name);
    };

    var merchant_sort_down = function(a, b) {
        return string_cmp(b.name, a.name);
    };

    var date_sort_up = function(a, b) {
        return transaction_date(a) - transaction_date(b);
    };

    var date_sort_down = function(a, b) {
        return transaction_date(b) - transaction_date(a);
    };


    var _sort = function(column, direction) {
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
            callback = desc ?  merchant_sort_down : merchant_sort_up;
            break;
        }
        getData().transactions.sort(callback);
    };


    // Sort a column
    var sort = function(column, direction) {
      filters.addSortFilter(column, direction);
      add_filter_cancel_button('sort', 'Sort ' + column);
      _sort(column, direction);
      return refresh_list();
    };


    var clear_filters = function() {
        if (filters.clearFilters() > 0) {
          $(['date', 'merchant', 'amount', 'sort']).each(function(type) {
              $('#search-term-' + type).remove();
          });
          $('#search-terms').empty();
          $('#search-terms').slideUp();
          data = null;
          getData();
        }
    };


    var reset = function() {
        clear_filters();
        return refresh_list();
    };


    var apply_filters = function() {
        if (filters.date.length > 0) {
            _filter_by_date( filters.date[0], filters.date[1] );
        }
        if (filters.merchant.length > 0) {
            _filter_by_merchant(filters.merchant[0]);
        }
        if (filters.amount.length > 0) {
            _filter_by_amount(filters.amount[0], filters.amount[1]);
        }
        if (filters.sort.length > 0) {
            _sort(filters.sort[0], filters.sort[1]);
        }
        return refresh_list();
    };

    var remove_filter = function(type) {
        if (filters.removeFilter(type) > 0) {
            data = null;
            getData();
            return apply_filters();
        }
        return length();
    };


    // <div><span>Vons</span><span class="cancel">&nbsp;</span></div>
    var add_filter_cancel_button = function(type, title) {
        var container = $('#search-terms');
        var id = 'search-term-' + type;
        var id_selector = '#' + id;
        if (container) {
            if ($(id_selector)) {
                $(id_selector).click();
                $(id_selector).remove();
            }
            container.slideDown();

            // Button container
            var button = $('<div/>').appendTo(container);
            button.attr('id', id);

            // Label for the button
            var label  = $('<span/>').appendTo(button);
            label.html(title);

            // Cancel icon
            var cancel = $('<span class="cancel">&nbsp;</span>').appendTo(button);

            // Add an onClick handler to remove this button an the filter
            button.on('click',  function() {
                $(id_selector).remove();
                if ($('#search-terms').children().length == 0) {
                    container.slideUp();
                }
                remove_filter(type);
                if (typeof button_callback === 'function') {
                    button_callback();
                }
            });
            return true;
        }
        return false;
    };


    var get = function(idx) {
        idx = idx || cur_idx;
        idx = parseFloat(idx);
        getData();
        if (idx < 0) { idx = 0; }
        if (idx >= data.transactions.length) {
            idx = data.transactions.length - 1;
        }
        cur_idx = idx;
        return data.transactions[idx];
    };

    var prev = function() {
        if (cur_idx > 0) {
            cur_idx = cur_idx - 1;
        }
        return getData().transactions[cur_idx];
    };

    var next = function() {
        if (cur_idx < getData().transactions.length - 1) {
            cur_idx = cur_idx + 1;
        }
        return getData().transactions[cur_idx];
    };

    // Display the details of the given transaction
    var update_transaction_details = function(transaction) {
        if (transaction.isPayment()) {
            $.mobile.changePage('#payment-detail', { changeHash: false } );
        } else {
            $.mobile.changePage('#transaction-detail', { changeHash: false } );
        }
        AccountData.transactions.displayTransactionHelper(transaction);
    };


    return {
        init: init,
        filterByDate: filter_by_date,
        filterByAmount: filter_by_amount,
        filterByMerchant: filter_by_merchant,
        sort: sort,
        reset: reset,
        clearFilters: clear_filters,
        filters: function() { return filters; },

        // Uncomment for debugging
        //remove_filter: remove_filter,
        //add_filter_cancel_button: add_filter_cancel_button,
        getData: getData,
        //cur_idx: function() { return cur_idx },
        //date_value_to_timestamp: date_value_to_timestamp,


        setFilterButtonCallback: function (callback) {
            button_callback = callback;
            return this;
        },

        first: function() {
            return getData().transactions[0];
        },

        get:  get,
        prev: prev,
        next: next,

        last: function() {
            return getData().transactions[data.transactions.length - 1];
        },

        showTransaction: function(idx) {
            update_transaction_details(get(idx));
        },

        showNextTransaction: function() {
            update_transaction_details(next());
        },

        showPrevTransaction: function() {
            update_transaction_details(prev());
        },

        /**
         * Given a vendor name, return the index for the first transaction
         * record.
         *
         * @param name  a vendor name
         * @return idx  the index of the transaction or -1 if not found
         */
        findFirst: function(name) {
            getData();
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
         * Returns delimited string of merchant names.
         *
         * @param delim  {String} delimiter
         * @return {String} delimited string of merchant names
         */
        getMerchants: function(delim) {
            getData();
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

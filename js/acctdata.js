var AccountData = AccountData || {};

// Use this BaseUrl attribute to change the global location of the data
AccountData.BaseUrl = 'data/acctdata';

/*
 * Account Data Loader
 *
 * Loads mock account information.
 *
 *   AccountData.account.initDropdown(account_number);
 *   var account_data = AccountData.account.getData();
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
AccountData.account = (function($) {
    var data = null,
        _active_acct_number = null,
        _active_cc_number   = null,
        _active_src_number  = null,
        _cc_card_img        = null;


    // TODO: CSS for cc-card-img { height: 28px; padding-top: 2px; }
    function cc_card_img() {
        if (_cc_card_img === null) {
            _cc_card_img = $('<img>', {
                'src':   'img/' + Client.name + '/card.png',
                'class': 'card-img'
            });
        }
        return _cc_card_img;
    }

    var makeAccountUrl = function() {
        return AccountData.BaseUrl + '/' + _active_acct_number + '.json';
    };

    // TODO: Move select tag into HTML, and turn 'selected' into ID
    var select_element = function(selected, disabled) {
        var select = $('<select>', {
            'id': 'card-choice',
            'name': 'card-choice',
            'data-mini': 'true'
        });
        if (disabled) {
            select.attr('disabled', 'disabled');
        }
        return select;
    };


    // TODO: Build option tag with jQuery methods
    var select_option = function(cc_number, selected) {
        var option = $('<option>', {'value': cc_number}),
            last_4 = cc_number.substr(-Client.card_show_digits);

        option.text(Client.card_digits_prefix + last_4);

        if (cc_number === selected) {
            option.attr('selected', 'selected');
        }

        return option;
    };


    var listCards = function(div, disabled) {
        var div = $('#' + div);
        div.empty();

        var selected_cc_number = AccountData.account.active_cc_number();

        // Add the CC icon
        $(cc_card_img()).appendTo(div);

        // Build the CC dropdown list
        var dropdown = select_element(selected_cc_number, disabled).appendTo(div);
        $(data.dest_accounts).each( function(i, acct) {
            select_option(acct.number, selected_cc_number).appendTo(dropdown);
        });

        try {
            dropdown.selectmenu();
        } catch(err) {
            BankDemo.log('listCards ERROR: ' + err);
        }

        // Setup the default change handler to record active CC number
        dropdown.on('change', function() {
            AccountData.account.set_active_cc_number(dropdown[0].value);
            //populate_payment_due();
            //listPaymentOptions("list-payment-amount", false);
        });

        // Call the change handler to update the active CC number
        dropdown.change();
        return dropdown;
    };


/*
    function payment_option_list() {
        return $('<select>', {
            'name':             'pmt-choice',
            'id':               'pmt-choice',
            'data-native-menu': 'false'
        });
    }

    function payment_option(value, option) {
        return $('<option>', {
            'value': value
        }).text(option);
    }

    var listPaymentOptions = function(div, disabled) {
        var acct = dest_account(),
            div  = $('#' + div);

        //get the current balance and minumum payment values
        //Only continue if min_pmt has a value
        if (acct.minpmt === null) {
            // set the current balance and don't create a a select option
            $('.payment-option').html('CURRENT<br />BALANCE');
            $('.payment-amount').html('$' + acct.balance);
            $('#pmtamount').val(acct.balance);
            return;
        }

        var list = payment_option_list().appendTo(div.empty());

        payment_option(acct.minpmt,  'Minimum Payment: $' + acct.minpmt ).appendTo(list);
        payment_option(acct.balance, 'Current Balance: $' + acct.balance).appendTo(list);

        try {
            list.selectmenu();
        } catch(err) {
            BankDemo.log('listPaymentOptions ERROR: ' + err);
        }

        //now hide the list by setting the parent div to hide
        $('#list-payment-amount').hide(); 

        list.on('change', function() {
            var acct = dest_account();
            if (list[0].value === acct.balance) {
                $('.payment-option').html('CURRENT<br />BALANCE');
                $('.payment-amount').html('$' + acct.balance);
                $('#pmtamount').val(acct.balance);
            } else {
                $('.payment-option').html('MINIMUM<br />PAYMENT');
                $('.payment-amount').html('$' + acct.minpmt);
                $('#pmtamount').val(acct.minpmt);
            }
        });
        // Call the change handler to update the active src number
        list.change();
        return list;
    }
*/

    var src_account = function() {
        if (_active_src_number == null) {
            _active_src_number = data.src_accounts[0].number;
        }
        return $.grep(data.src_accounts, function(acct) {
            return acct.number === _active_src_number;
        })[0];
    };


    var dest_account = function() {
        if (data === null) {
            throw 'data is null in dest_account';
        }
        return $.grep(data.dest_accounts, function(acct) {
            return acct.number === _active_cc_number;
        })[0];
    };

    function set_payment_amount() {
        var acct = AccountData.account.getDestAccount();

        // Right now sets to minimum balance if a value is set in the json
        // Otherwise sets to the current balance
        if (acct.minpmt !== null) {
            $('#pmtamount').val(acct.minpmt);
        } else {
            $('#pmtamount').val(acct.balance);
        }
    }

    var populate_payment_due = function() {
        var acct = dest_account(),
            date = AccountData.Utils.dateDue(acct.datedue);

        // set values in main menu
        $('.card-type').text(acct.name);
        $('.payment-due-date').text(date);
        $('.payment-option').html('CURRENT<br/>BALANCE');
        $('.payment-amount').html('$' + acct.balance);
       
        // set values in payment
        try {
            var datebox_date = AccountData.Utils.dateDueDatebox(acct.datedue);
            $('#pmtdatehidden').data('datebox').options.highDates = [datebox_date];
        } catch(err) {
            BankDemo.log('populate_payment_due ERROR: ' + err);
        }
        set_payment_amount();
        return acct;
    };


    // API bits
    return {
        init: function(acct_number) {
            _active_acct_number = acct_number;
        },
        initDropdown: function(div, disabled, callback) {
            var url = makeAccountUrl();
            if (data === null) {
                $.getJSON(url, function(results) {
                    data = results;
                    var dropdown = listCards(div, disabled);
                    if (typeof callback === 'function') {
                        callback(dropdown, data);
                    }
                    BankDemo.log('initDropdown: loaded URL "' + url + '"');
                });
            } else {
                var dropdown = listCards(div, disabled);
                if (typeof callback === 'function') {
                    callback(dropdown, data);
                }
            }
        },
/*
        initPmtOptsDropdown: function(div, disabled, callback) {
            var url = makeAccountUrl();
            if (data === null) {
                $.getJSON(url, function(results) {
                    data = results;
                    var list = listPaymentOptions(div, disabled);
                    if (typeof callback === 'function') {
                        callback(list, data);
                    }
                });
            } else {
                var list = listPaymentOptions(div, disabled);
                if (typeof callback === 'function') {
                    callback(list, data);
                }
            } 
        },
*/
        setDefaultPayment:  set_payment_amount,
        getData: function() {
            return data;
        },
        active_acct_number: function() {
            return _active_acct_number;
        },
        set_active_cc_number: function(newval) {
            console.log(' ** changing _active_cc_number to: ' + newval);
            _active_cc_number = newval;
        },
        active_cc_number: function() {
            return _active_cc_number;
        },
        refresh_cc_dropdown: function(div) {
            return listCards(div, false);
        },
        set_active_src_number: function(newval) {
            _active_src_number = newval;
        },
        active_src_number: function () {
            return _active_src_number;
        },
        getDestAccount: dest_account,
        getDestAccountName: function () {
            return dest_account().name;
        },
        get_current_balance: function () {
            return dest_account().balance;
        },
        getClientCardPrefix: function () {
            return Client.card_digits_prefix;
        },
        getDestAccountNumberShort: function () {
            return dest_account().number.substr(-Client.card_show_digits);
        },
        getSrcAccount: src_account,
        getSrcAccountName: function () {
            return src_account().name;
        },
        getSrcAccountNumberShort: function () {
            return src_account().number.substr(-4);
        },
        populate_src_acct_info: function() {
            return populate_src_acct_info();
        },
        get_minimum_payment: function () {
            if (dest_account().minpmt  != null) {
                return dest_account().minpmt;
            } else {
                return 20;
            }
        },
        populate_payment_due: populate_payment_due
    };
})(jQuery);

/*
 * Account Transaction Loader
 *
 * Loads mock transaction data for a given CC number.
 *
 *   AccountData.transactions.display(cc_number);
 *   var data = AccountData.transactions.getData();
 *   for (var i = 0; i < data.transactions.length; i += 1) {
 *       ...
 *   }
 *
 * transactionData.transactions => array of hash {
 *   id,
 *   name, address, city, state, zipcode,
 *   amount,
 *   dow, day, month, year, time, zone
 * }
 */
AccountData.transactions = (function($) {
    var data = null;
    var active_cc_number = null;

    // Return the URL for fetching the CC transaction information
    var makeCCNumberUrl = function() {
        return AccountData.BaseUrl + '/transactions-' +
               active_cc_number + '.json';
    };

    // Return the HREF for displaying transaction details
    var transactionShowHref = function(idx, transaction) {
        var page = transaction.isPayment() ? '#payment-detail'
                                            : '#transaction-detail';
        return page + '?index=' + idx +
               '&cc_number=' + AccountData.account.active_cc_number() +
               '&transaction_id=' + transaction.id;
    };

    // Return the HTML for the Date portion of the list item
    var transactionCal = function(transaction) {
        return '<div class="list-cal">' +
               '<div class="cal-top">' + transaction.dowMonth() + '</div>' +
               '<div class="cal-bot">' + transaction.day + '</div>' +
               '</div>';
    };

    // Return a short description in 2 divs for the charge list
    var transactionShort = function(transaction) {
        var div = transactionCal(transaction) + '<div class="list-partial">';
        if (transaction.isPayment()) {
            div += '<div class="part-payment">' + transaction.name + '</div>';
        } else {
            div += '<div class="part-name">' + transaction.name + '</div>';
            div += '<div class="part-addr">' + transaction.locationShort() +
                   '</div>';
        }
        div += '</div>';
        div += '<div class="list-amount">' + transaction.amount + '</div>';
        return div;
    };

    // Display the list of transactions in the charges-list
    var displayTransactions = function(data) {
        var page = location.hash.replace(/\?.*/, '');
        if (page === '#recent-transactions') {
            var list = $("#charges-list");
            list.empty();
            var items = [];
            for (var i = 0; i < data.transactions.length; i += 1) {
                var transaction = data.transactions[i];
                var show = transactionShort(transaction);
                var href = transactionShowHref(i, transaction);
                items.push('<li><a data-url="' + href + '" href="' + href + '">' + show + '</a></li>');
            }
            $(items.join('')).appendTo(list);
            if (data.transactions.length > 0) {
                try {
                    list.listview('refresh');
                } catch(err) {
                    BankDemo.log('displayTransactions ERROR: ' + err);
                }
            }
        }
    };

    // Display a specific transaction in the charge-detail
    var displayTransactionHelper = function(transaction) {
        if (transaction != null) {
            var city = transaction.location();
            if (transaction.isPayment()) {
                $('#payment-amount').html(transaction.payment());
                $('#payment-datetime').html(transaction.fullDate());
            } else {
                $('#amount').html(transaction.amount);
                $('#datetime').html(transaction.fullDate());
                $('#merchant').html(transaction.merchant);
                if (transaction.address.length > 0) {
                    $('#mlocation').html(transaction.address + '<br/>' + city);
                } else {
                    $('#mlocation').html(city);
                }
                if (city == "") {
                    $('#map').attr('src', "");
                } else {
                    $('#map').attr('src',
                        'https://maps.googleapis.com/maps/api/staticmap?center=' +
                        encodeURIComponent(transaction.fullAddress()) +
                        '&zoom=14&size=288x200&markers=' +
                        encodeURIComponent(transaction.fullAddress()) +
                        '&sensor=false');
                }
            }
        }
    };

    var getData = function() {
        if (active_cc_number) {
            return data[active_cc_number];
        }
        return { transactions: [] };
    };

    var show_transactions = function(data, callback) {
        var page = location.hash.replace(/\?.*/, '');
        if (page === '#recent-transactions') {
            displayTransactions(data);
        }
        if (typeof callback === 'function') {
            callback(data);
        }
    };

    var load_cc_data = function(cc_number, callback) {
        var url = makeCCNumberUrl(cc_number);
        $.getJSON(url, function(results) {
            var list = results.transactions;
            data[cc_number] = {};
            data[cc_number].transactions = list.map(function(obj) {
              return new Transaction(obj);
            });
            show_transactions(data[cc_number], callback);
        });
    };

    return {
        display: function(cc_number, callback) {
            active_cc_number = cc_number
            data = data || {};
            if (data[active_cc_number] === undefined) {
                load_cc_data(cc_number, callback);
            } else {
                show_transactions(data[cc_number], callback);
            }
        },
        displayTransactions: displayTransactions,
        displayTransactionHelper: displayTransactionHelper,
/*
        displayTransaction: function(cc_number, transaction_id, callback) {
            var url = makeCCNumberUrl(cc_number);
            $.getJSON(url, function(results) {
                for (var i = 0; i < results.transactions.length; i += 1) {
                    var transaction = results.transactions[i];
                    if (transaction_id == transaction.id) {
                        displayTransactionHelper(transaction);
                        if (typeof callback === 'function') {
                            callback(transaction);
                        }
                        break;
                    }
                }
            });
        },
*/
        getData: getData,
        getMerchants: function() {
            return $.unique(getData().transactions.map(function(transaction) {
                return AccountData.Utils.merchantDecode(transaction.merchant);
            }).sort()).sort();
        }
     };
})(jQuery);



// ----------------------------------------------------------------------------
// Module: AccountData.Utils
//
// AccountData.Utils.timestampToObject(millis)
// AccountData.Utils.transactionDate(transaction)
// AccountData.Utils.transactionDateObject(transaction)
//
AccountData.Utils = (function($) {
    var two_digit_string = function(num) {
        return (num < 10) ? '0' + num : '' + num;
    };

    // Convert milliseconds into displayable date attributes
    //
    //  var millis = $.now();
    //  var dt_obj = AccountData.Utils.timestampToObject(millis);
    //
    // @param timestamp - integer, time in millis
    // @return object - day, dow, month, year attributes
    //
    var timestamp_to_object = function(timestamp) {
        var date = new Date(timestamp);
        var hour = two_digit_string(date.getHours());
        var mins = two_digit_string(date.getMinutes());
        var secs = two_digit_string(date.getSeconds());
        var time = [hour, mins, secs].join(':');
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

    // Convert 'daysago' or [dow, month, day, year, time, zone] into a
    // timestamp (in milliseconds). Returns -1 if timestamp cannot be
    // created.  Updates transaction object with 'timestamp' attribute.
    //
    // @param transaction - a transaction object from JSON
    // @return timestamp in milliseconds
    //
    var transaction_date = function(transaction) {
        var day_millis = 24 * 60 * 60 * 1000;
        if (transaction['timestamp'] !== undefined) {
            return transaction.timestamp;
        }
        if (transaction['daysago'] !== undefined) {
            var now = new Date();
            var hrs = transaction.time.match(/\d+/g).map(function(a) {return a - 0});
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

    var merchant_decode = function(value) {
        return $('<div/>').html(value).text();
    }

    // Return a date object for the given transaction
    //
    // @param transaction - a transaction object from JSON
    // @return object - day, dow, month, year attributes
    //
    var transaction_date_object = function(transaction) {
        return timestamp_to_object(transaction_date(transaction));
    };

    // @param datedue  - a string of either a day-offset or date
    // @return tstamp - the due date in milliseconds
    var parse_due_date = function(datedue) {
        var tstamp = 0;
        if (datedue.match(/^-?\d+$/)) {
            tstamp = $.now() + (parseFloat(datedue) * 24 * 60 * 60 * 1000) * -1;
        } else {
            tstamp = Date.parse(datedue);
        }
        return tstamp;
    };

    // @param datedue  - a string of either a day-offset or date
    // @return due_date - a string like 'Jan 1, 1970'
    var date_due = function(datedue) {
        var obj = timestamp_to_object(parse_due_date(datedue));
        return obj.month + ' ' + obj.day + ', ' + obj.year;
    };

    // @param datedue  - a string of either a day-offset or date
    // @return due_date - a string like '1970-01-01'
    var date_due_datebox = function(datedue) {
        var obj = timestamp_to_object(parse_due_date(datedue));
        return obj.year + '-' + obj.mm + '-' + obj.dd;
    };


    return {
        timestampToObject: timestamp_to_object,
        transactionDate: transaction_date,
        transactionDateObject: transaction_date_object,
        merchantDecode: merchant_decode,
        dateDue: date_due,
        dateDueDatebox: date_due_datebox
    };
})(jQuery);

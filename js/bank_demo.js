/**
 * ------------------------------------------------------------------------------
 *
 * Bank Demo Javascript
 *
 *  Defines a BankDemo.Controller base class from which all page controllers
 *  are a subclass.
 *
 *  Unlike an standard MVC style web application, each page is given it's own
 *  controller, and in this sense, a controller enables the UI of the page,
 *  and not the general activities around a set of models.
 *
 * Coding Conventions:
 *
 *  - Object-oriented coding.
 *  - Classe names are PascalCased
 *  - Public methods are camelCased
 *  - Private methods are lower_case_with_underscores
 *  - 'init' method is used to initialize each page
 *  - Prefer jQuery utility methods over for/for-in loops
 *  - Avoid inline Javascript in HTML
 *  - Prefer post-loaded Javascript
 *  - === (strict) is preferred over == (coersive)
 *  - !== (strict) is preferred over != (coersive)
 *  - Single quotes (') are preferred over double quotes (")
 *  - All methods should have a return value ('return this;' is a good default)
 *
 * Preferences:
 *  - All Javascript passes JSLint evaluation, with the following exceptions:
 *    + 'use strict'; pragma not required
 *
 * -------------------------------------------------------------------------------
 */

/**
 * @namespace BankDemo
 * @author    24/7, Inc. MM Team
 * @version   1.03
 */


/**
 * @module BankDemo Provides global application values and functions.
 *
 * @method getUrlVar
 * @method log
 * @method prompt
 */
var BankDemo = (function ($) {
    /**
     * @method get_url_search - Return the href query (a.k.a search) string.
     *
     * Note that jQuery Mobile doesn't support query parameter passing
     * to internal/imbedded pages, so the query string is appended to the
     * hash value (e.g. "#somePage?someId=1")
     *
     * @param  {String}  url - optional url, defaults to window.location.href
     *
     * @return {Array}   an array of query key=value pairs or an empty array.
     */
    function get_url_search(url) {
        var search = $.mobile.path.parseUrl(url || window.location.href);
        search = search.search || search.hash.replace(/^#.*?\?/, '?');
        return search.slice(1).split('&');
    };

    return {
        /**
         * The account number for the demo, which translates into the
         * proper JSON file (e.g. 1.json) in the data/acctdata dir.
         *
         * NOTE: Only this needs to change when changing accounts.
         */
        AccountNumber: 2,

        /**
         * The various audio prompts used in the appliaction.
         *
         * Moving the paths here allows us to easily make these
         * paths customizable per client.
         */
        Prompts: {
            //'mainmenu':     'MainMenu.wav',
            'mainmenu':     'RT_Menu_01.wav',
            'payment':      'MakeAPayment.wav',
            'acctfrom':     'SelectPaymentAccount.wav',
            'acctadd':      'AddNewAccount.wav',
            'rt-01':        'RT_RecentTransactions_01.wav',
            'rt-02':        'RT_RecentTransactions_02.wav',
            'rt-03':        'RT_RecentTransactions_03.wav',
            'rt-detail-01': 'RT_TransactionDetails_01.wav',
            'rt-detail-02': 'RT_TransactionDetails_02.wav',
            'rt-detail-03': 'RT_TransactionDetails_03.wav'
        },

        /**
         * @method getUrlVar - Parses the url search string into query
         * parameters and returns the value of the given URL param name.
         *
         * @param name {String} - the desired parameter name
         * @return {String}     - the parameter value or null if the parameter
         *                        isn't found.
         * @example
         * var id = BankDemo.getUrlVar('product_id');
         */
        getUrlVar: function (name) {
            var params = $.grep(get_url_search(), function (param) {
                return param.indexOf('=') > 0 && param.split('=')[0] === name;
            });
            if (params.length === 1) {
                return params[0].split('=')[1];
            }
            return null;
        },

        /**
         * @method log - A wrapper function around the NativeBridge.log
         * and console.log functions.
         *
         * @param msg {String} - the message to print.
         * @return {Integer}   - 1 if console.log exists, 0 otherwise
         */
        log: function (msg) {
            NativeBridge.log(msg);
            if (console && console.log) {
                console.log(msg);
                return 1;
            }
            return 0;
        },

        /**
         * @method prompt - Play the audio prompt defined for the given page.
         *
         * @param page {String} - a page listed in the BankDemo.Prompts hash.
         * @return {Boolean}    - true if the page prompt exists.
         *
         * @example
         * BankDemo.prompt('main-menu');
         */
        prompt: function (page) {
            if (typeof BankDemo.Prompts[page] !== 'undefined') {
                NativeBridge.playAudio('audio/' + BankDemo.Prompts[page]);
                return true;
            }
            BankDemo.log('[prompt] cannot find WAV for "' + screen + '"');
            return false;
        }
    }
}(jQuery));


/**
 * @module BankDemo.RT - Recent Transaction Specific Configuration
 */
BankDemo.RT = (function ($) {
    var root_url = $.mobile.path.get(window.location.href),
        dynamic  = root_url.replace('/content/', '/perl/') +
                   'grammars/dynamicgram.pl';

    return {
        /**
         * @method merchantDelim - Returns the delimiter used to send
         * records to our dynamic grammar generation script.
         */
        merchantDelim: function () {
            return '<DELIM>';
        },

        /**
         * @method getRootUrl - Return the "absolute" path to our current
         * app location from the point of view of the browser.
         */
        getRootUrl: function () {
            return root_url;
        },

        /**
         * @method getDynamicGrammarUrl - Returns the location of the
         * dynamic grammar generator.
         */
        getDynamicGrammarUrl: function () {
            return dynamic;
        }
    }
}(jQuery));


/**
 * @class BankDemo.Controller - from which all other controllers will be
 * an instance of and are expecte to extend.
 *
 * @constructor
 */
BankDemo.Controller = function (name) {
    name = name || 'Controller';
    this.setLoggingPrefix(name);
    this.setPrompted(false);
    this.clearRecoErrors();
    this._cc_change_handlers = $([]);
};

BankDemo.Controller.prototype = (function ($) {
    var _cc_card_img = null;

    function cc_card_img() {
        if (_cc_card_img === null) {
            _cc_card_img = $('<img>', {
                'src':   Client.card_image,
                'class': 'card-img'
            });
        }
        return _cc_card_img;
    }

    function cc_list_select(selected, disabled) {
        var select = $('<select>', {
            'id': 'card-choice',
            'name': 'card-choice',
            'data-mini': 'true'
        });
        if (disabled) {
            select.attr('disabled', 'disabled');
        }
        return select;
    }


    function cc_list_select_option(account, selected) {
        var option = $('<option>', {'value': account.number});

        option.text(account.card_display);

        if (account.number === selected) {
            option.attr('selected', 'selected');
        }

        return option;
    }

    function cc_list_display(id, disabled) {
        var div = $('#' + id).empty(),
            num = AccountData.Account.activeCcNumber(),
            sel = cc_list_select(num, disabled).appendTo(div);

        // Add the CC image
        $(cc_card_img()).appendTo(div);

        // Add the cards numbers to the list
        $(AccountData.Account.getData().dest_accounts).each( function (i, account) {
            cc_list_select_option(account, num).appendTo(sel);
        });

        try {
            sel.selectmenu();
        } catch(err) {
            BankDemo.log('ccListDisplay: ERROR: ' + err);
        }

        sel.on('change', function () {
            AccountData.Account.setActiveCcNumber( sel[0].value );
        });

        sel.change();
        return sel;
    }

    return {
        /**
         * @method setLoggingPrefix - Logging prefix setter
         * @param  {String}  prefix  The logging prefix.
         */
        setLoggingPrefix: function (prefix) {
            this._l_prefix = prefix;
            return this;
        },

        /**
         * @method log - Logging method for debugging.
         * @param msg {String} - The message to log.
         * @see BankDemo#log for return value
         */
        log: function (msg) {
            return BankDemo.log(this._l_prefix + ': ' + msg);
        },

        /**
         * @method clearRecoErrors - Clear recognition errors counter.
         * @return this
         */
        clearRecoErrors: function () {
            this._rec_errs = 0;
            return this;
        },

        /**
         * @method recoError - Increment the recognition errors counter and
         * log the given messa
         * @param  msg {String} - The message to log.
         * @see BankDemo.Controller#log for return value
         */
        recoError: function (msg) {
            this._rec_errs += 1;
            return this.log(msg);
        },

        /**
         * @method recoErrors
         * @return the number reco errors.
         */
        recoErrors: function () {
            return this._rec_errs;
        },

        /**
         * @method hasRecoErrors - Checks for recognition errors.
         * @return {Boolean}  true if there are recognition errors recorded
         */
        hasRecoErrors: function () {
            this.log('recoErrors: ' + this._rec_errs);
            return this._rec_errs > 0;
        },

        /**
         * @method changePage - Change the page to the page with the
         * given page ID.
         * @param page {String} - The page ID to change to, e.g. '#main'
         */
        changePage: function (page) {
            NativeBridge.cancelAudio();
            this.clearRecoErrors();
            $.mobile.changePage($(page), {transition: 'none'});
        },

        prompted: function () {
            return this._prompted;
        },

        setPrompted: function (value) {
            this._prompted = value;
        },

        emptyGrammarHandler: function () {},

        unsetGrammar: function () {
            NativeBridge.setGrammar(null, null, this.emptyGrammarHandler);
        },

        setGrammar: function (message, grammar, handler) {
	    this.log('Setting grammar to: ' + grammar);
            NativeBridge.setMessage(message);
            NativeBridge.setGrammar(grammar, null, handler);
        },

        beforeHide: function () {
            //NativeBridge.cancelAudio();
            return false;
        },

        onAccountLoad: function (data, id, disabled, callback) {
            var dropdown = cc_list_display(id, disabled);
            if (typeof callback === 'function') {
                callback(dropdown, data);
            }
        },

        ccChangeHandlers: function () {
            var self = this;
            return function (dropdown, data) {
                self._cc_change_handlers.each( function (i, handler) {
                    handler(dropdown, data);
                });
            }
        },

        addCcChangeHandler: function (handler) {
            this._cc_change_handlers.push(handler);
            return this;
        },

        initDropdown: function (dropdown_id, disabled) {
            AccountData.Account.initDropdown(this.onAccountLoad,
                                             dropdown_id, disabled,
                                             this.ccChangeHandlers());
        }
    };
}(jQuery));


// Controller Class for RecentTransactions
//
// Adds controls around transactions list
BankDemo.RT.Controller = BankDemo.Controller;
BankDemo.RT.Controller.prototype = new BankDemo.Controller();

jQuery.extend(BankDemo.RT.Controller.prototype, (function ($) {

    function set_payment_options(label, value) {
        $('.payment-option').html(label);
        $('.payment-amount').html('$' + value);
    }

    function payment_option(value, option) {
        return $('<option>', {'value': value}).text(option);
    }

    function init_payment_options() {
        var div = $('#list-payment-amount'),
            cur_balance,
            min_payment,
            list;

        div.empty();

        // get the current balance and minumum payment values
        var cur_balance = AccountData.Account.getCurrentBalance();
        var min_payment = AccountData.Account.getMinimumPayment();

        // Only continue if min_payment has a value
        if (min_payment === null) {
            // set the current balance and don't create a a select option
            set_payment_options('CURRENT<br/>BALANCE', cur_balance);
            $('#pmtamount').val(cur_balance);
        }

        list = $('<select>', {
            'name': 'pmt-choice',
            'id':   'pmt-choice',
            'data-native-menu': 'false'
        }).appendTo(div);

        payment_option(min_payment, 'Minimum Payment: $' + min_payment).appendTo(list);
        payment_option(cur_balance, 'Current Balance: $' + cur_balance).appendTo(list);

        try {
            list.selectmenu();
        } catch(err) {
            BankDemo.log('init_payment_options list.selectmenu ERROR: ' + err);
        }

        list.on('change', function() {
            var balance = AccountData.Account.getCurrentBalance();
            if (list[0].value === balance) {
                set_payment_options('CURRENT<br/>BALANCE', cur_balance);
                $('#pmtamount').val(cur_balance);
            } else {
                set_payment_options('MINIMUM<br/>PAYMENT', min_payment);
                $('#pmtamount').val(min_payment);
            }
        });

        // Call the change handler to update the active src number
        try {
            list.change();
        } catch(err) {
            BankDemo.log('init_payment_options list.change ERROR: ' + err);
        }
        return list;
    }

    function populate_payment_due() {
        var acct = AccountData.Account.getDestAccount(),
            date = AccountData.Utils.dateDue(acct.datedue)

        // set values in main menu
        $('.card-type').text(acct.name);
        $('.payment-due-date').text(date);
        return date;
    }

    return {
        initPaymentOptions: init_payment_options,

        populatePaymentDue: populate_payment_due,

        dynamicGrammarUrl: function(type) {
            var merchants = AccountData.Transactions.getMerchants();
            merchants = merchants.join( BankDemo.RT.merchantDelim() );

            return BankDemo.RT.getDynamicGrammarUrl() +
                   '?type=' + type + '&merchants=' +
                   encodeURIComponent(merchants);
        },

        ccChangeHandler: function (dropdown, data) {
            // Callback sets onchange handler for dropdown
            dropdown.on('change', function () {
                init_payment_options();
                populate_payment_due();
                TransactionList.init();
            });
            // Simulate on onchange event
            dropdown.change();
        }
    }
}(jQuery)));


// Main Menu Controller
//
// Sets up the menu button click actions and displays relevant card data.
//
BankDemo.MainMenuController = new BankDemo.RT.Controller('MainMenuController');

jQuery.extend(BankDemo.MainMenuController, (function ($) {
    var self = BankDemo.MainMenuController,
        set_grammar,
        grammar_handler,
        type = 'mainmenu';

    set_grammar = function (message) {
        self.setGrammar(message, self.dynamicGrammarUrl(type), grammar_handler);
    };

    grammar_handler = function (result) {
        var interp, filed, value, comparison, label;

        self.log('reco result: ' + JSON.stringify(result));

        if (result === null || result.length === 0) {
            self.recoError('no reco result');

        } else {
            interp = result[0].interpretation;

            switch (interp.action) {
            case 'recent transactions':
                self.changePage('#recent-transactions');
                break;

            case 'filter':
                field      = interp.field.toLowerCase();
                value      = interp.value;
                comparison = interp.comparison.toLowerCase();

                switch (field) {
                case 'amount':
                    TransactionList.filterByAmount(value, comparison);
                    label = [comparison.capitalize(), value].join(' ');
                    BankDemo.RecentTransactionsController.addFilterButton('amount', label);
                    break;

                case 'date':
                    value = parseFloat(value);
                    TransactionList.filterByDate(value, comparison);
                    label = date_filter_label(value, comparison);
                    BankDemo.RecentTransactionsController.addFilterButton('date', label);
                    break;

                case 'merchant':
                    TransactionList.filterByMerchant(value);
                    BankDemo.RecentTransactionsController.addFilterButton('merchant', value);
                    break;
                }

                self.changePage('#recent-transactions');
                break;

            case 'make payment':
                self.changePage('#payment');
                break;

            case 'find atm':
            case 'rewards':
            case 'contact':
            case 'report missing':
                self.recoError('not implemented yet');
                set_grammar(null);
                break;

            case 'no':
                self.clearRecoErrors();
                set_grammar('How can I help you today?');
                break;

            default:
                self.recoError('unknown action: "' + interp.action + '"');
                break;
            }
        }

        if (self.hasRecoErrors()) {
            set_grammar("I'm sorry, I didn't get that.");
        }
    };

    return {
        beforeShow: function () {
            BankDemo.RecentTransactionsController.removeFilterButtons();
        },

        onShow: function () {
            self.initDropdown('last-4-digits-main', false);
            set_grammar('How may I help you?');
            if (! self.prompted()) {
                BankDemo.prompt('mainmenu');
                self.setPrompted(true);
            }
        },

        init: function () {
            var page = $('#main-menu');
            if (page.length > 0) {
                page.on('pagebeforeshow', self.beforeShow);
                page.on('pageshow',       self.onShow);
                page.on('pagebeforehide', self.beforeHide);
                // Recent Transactions Demo
                $('#recent-transactions-button').on('click', function () {
                    BankDemo.ChatController.setChatBubbleImage('charges');
                    self.changePage('#recent-transactions');
                });
                // Payments Demo
                $('#make-a-payment-button').on('click', function () {
                    BankDemo.ChatController.setChatBubbleImage('payments');
                    self.changePage('#payment');
                });
                self.addCcChangeHandler(self.ccChangeHandler);
                return true;
            }
            return false;
        }
    }
}(jQuery)));



// Recent Transactions Controller
//
//
BankDemo.RecentTransactionsController = new BankDemo.RT.Controller('RecentTransactionsController');

jQuery.extend(BankDemo.RecentTransactionsController, (function ($) {
    var self = BankDemo.RecentTransactionsController,
        set_grammar,
        grammar_handler,
        type = 'recenttransactions';

    set_grammar = function (message) {
        self.setGrammar(message, self.dynamicGrammarUrl(type), grammar_handler);
    };

    // <div><span>Vons</span><span class="cancel">&nbsp;</span></div>
    function add_filter_button(type, title) {
        var container = $('#search-terms'),
            button_id = 'search-term-' + type,
            button    = $('#' + button_id);

        if (container) {
            if (button.length > 0) {
                button.remove();
            }
            container.slideDown();

            // Button container
            button = $('<div>').attr('id', button_id).appendTo(container);

            // Label for the button
            $('<span>').html(title).appendTo(button);

            // Cancel icon
            $('<span>', {'class': 'cancel'}).html('&nbsp;').appendTo(button);

            // Add an onClick handler to remove this button an the filter
            button.on('click',  function() {
                $('#' + button_id).remove();
                if ($('#search-terms').children().length === 0) {
                    container.slideUp();
                }
                TransactionList.removeFilter(type);
                set_grammar(null);
                if (typeof button_callback === 'function') {
                    button_callback();
                }
            });

            return true;
        }
        return false;
    }

    function date_filter_label(value, direction) {
        var str = '', date;

        if (typeof value === 'number') {
            date = AccountData.Utils.timestampToObject(value);
            str  = date.month + ' ' + date.day;
        } else {
            str  = value.match(/[JFMASOND][a-z]{2} \d+/)[0];
        }

        if (direction !== undefined && direction.length > 0) {
            return direction.capitalize() + ' ' + str;
        }

        return str;
    }

    function remove_filter_buttons() {
       TransactionList.clearFilters();
       $(['date', 'merchant', 'amount', 'sort']).each(function(type) {
           $('#search-term-' + type).remove();
       });
       $('#search-terms').empty();
       $('#search-terms').slideUp();
    }

    grammar_handler = function (result) {
        var interp, action, column, direction,
            field, value, comparison, label, transaction;

        self.log('reco result: ' + JSON.stringify(result));

        if (result === null || result.length === 0) {
            self.recoError('no reco result');

        } else {
            interp = result[0].interpretation;
            action = interp.action.toLowerCase();

            switch (action) {
            case 'sort':
                column    = interp.field.toLowerCase();
                direction = interp.order.toLowerCase();

                TransactionList.sort(column, direction);
                add_filter_button('sort', 'Sort ' + column);

                self.clearRecoErrors();
                set_grammar(null)
                break;

            case 'filter':
                field      = interp.field.toLowerCase();
                value      = interp.value;
                comparison = interp.comparison.toLowerCase();

                switch (field) {
                case 'amount':
                    TransactionList.filterByAmount(value, comparison);
                    label = [comparison.capitalize(), value].join(' ');
                    add_filter_button('amount', label);
                    break;

                case 'date':
                    value = parseFloat(value);
                    TransactionList.filterByDate(value, comparison);
                    label = date_filter_label(value, comparison);
                    add_filter_button('date', label);
                    break;

                case 'merchant':
                    TransactionList.filterByMerchant(value);
                    add_filter_button('merchant', value);
                    break;
                }

                self.clearRecoErrors();
                set_grammar(null);
                break;

            case 'detail':
                transaction = TransactionList.get(parseInt(interp.idx));
                BankDemo.TransactionDetailController.displayTransactionDetails(transaction);

                self.changePage('#transaction-detail');
                break;

            case 'chat':
                BankDemo.ChatController.setDoneButtonLink();

                self.changePage('#chat');
                break;

            case 'make payment':
                self.changePage('#payment');
                break;

            case 'main menu':
            case 'go back':
                self.changePage('#main-menu');
                break;

            default:
                self.recoError('unhandled action: "' + action + '"');
                break;
            }
        }

        if (self.hasRecoErrors()) {
            set_grammar(null);
            if (self.recoErrors() === 1) {
                BankDemo.prompt('rt-02');
            } else {
                BankDemo.prompt('rt-03');
            }
        }
    };

    // Return the HREF for displaying transaction details
    function transaction_href(idx, transaction) {
        var page = transaction.isPayment() ? '#payment-detail'
                                            : '#transaction-detail';
        return page + '?index=' + idx +
               '&cc_number=' + AccountData.Account.activeCcNumber() +
               '&transaction_id=' + transaction.id;
    }

    // Return the HTML for the Date portion of the list item
    function transaction_cal(transaction) {
        return '<div class="list-cal">' +
               '<div class="cal-top">' + transaction.dowMonth() + '</div>' +
               '<div class="cal-bot">' + transaction.day + '</div>' +
               '</div>';
    }

    // Return a short description in 2 divs for the charge list
    function transaction_short(transaction) {
        var div = transaction_cal(transaction) + '<div class="list-partial">';
        if (transaction.isPayment()) {
            div += '<div class="part-payment">' + transaction.name + '</div>';
        } else {
            div += '<div class="part-name">' + transaction.name + '</div>';
            div += '<div class="part-addr">' + transaction.locationShort() + '</div>';
        }
        div += '</div>';
        div += '<div class="list-amount">' + transaction.amount + '</div>';
        return div;
    }

    // Display the list of transactions in the transactions-list
    function display_transactions(data) {
        var page = location.hash.replace(/\?.*/, '');
        if (page === '#recent-transactions') {
            var list = $("#transactions-list");
            list.empty();
            var items = [];
            for (var i = 0; i < data.transactions.length; i += 1) {
                var transaction = data.transactions[i];
                var show = transaction_short(transaction);
                var href = transaction_href(i, transaction);
                items.push('<li><a data-url="'+href+'" href="'+href+'">'+show+'</a></li>');
            }
            $(items.join('')).appendTo(list);
            if (data.transactions.length > 0) {
                try {
                    list.listview('refresh');
                } catch(err) {
                    BankDemo.log('display_transactions ERROR: ' + err);
                }
            }
        }
    }

    return {
        beforeShow: function () {
            AccountData.Transactions.setOnLoadCallback( set_grammar );
            self.initDropdown('last-4-digits-recent-transactions', false);
        },

        onShow: function () {
            self.clearRecoErrors();
            if (! self.prompted()) {
                BankDemo.prompt('rt-01');
                self.setPrompted(true);
            }
            $('#transactions-list').listview('refresh');
        },

        addFilterButton: add_filter_button,
        removeFilterButtons: remove_filter_buttons,

        init: function () {
            var page = $('#recent-transactions');
            if (page.length > 0) {
                page.on('pagebeforeshow', self.beforeShow);
                page.on('pageshow',       self.onShow);
                page.on('pagebeforehide', self.beforeHide);
                $('#back-to-main').on('click', function () {
                    remove_filter_buttons();
                    self.changePage('#main-menu');
                });
                $('#pay-now').on('click', function () {
                    remove_filter_buttons();
                    self.changePage('#payment');
                });
                self.addCcChangeHandler(self.ccChangeHandler);
                AccountData.Transactions.setDisplayCallback(display_transactions);
                return true;
            };
            return false;
        }
    };
}(jQuery)));


//
// Transaction Detail Controller
//
BankDemo.TransactionDetailController = new BankDemo.RT.Controller('TransactionDetailController');

jQuery.extend(BankDemo.TransactionDetailController, (function ($) {
    var self = BankDemo.TransactionDetailController,
        set_grammar,
        grammar_handler;

    set_grammar = function (message) {
        self.setGrammar(message, 'grammars/transactiondetail.grxml', grammar_handler);
    };

    /**
     * @method display_payment_details - populate payment information on the
     * payment details page.
     * @param transaction {Transaction}
     * @see Transaction
     */
    function display_payment_details(transaction) {
        if (transaction === null) {
            throw 'display_payment_details: transaction is null';
        }
        if (! transaction.isPayment()) {
            throw 'display_payment_details: transaction is not payment';
        }
        $('#payment-amount').html(transaction.payment());
        $('#payment-datetime').html(transaction.fullDate());
    }

    /**
     * @method display_charge_details - populate charge information on the
     * charge details page.
     * @param transaction {Transaction}
     * @see Transaction
     */
    function display_charge_details(transaction) {
        var map_url  = '';

        if (transaction === null) {
            throw 'display_charge_details: transaction is null';
        }
        if (transaction.isPayment()) {
            throw 'display_charge_details: transaction is a payment';
        }

        if (transaction.location() !== '') {
            map_url = 'https://maps.googleapis.com/maps/api/staticmap?center=' +
                      encodeURIComponent(transaction.fullAddress()) +
                      '&zoom=14&size=288x200&markers=' +
                      encodeURIComponent(transaction.fullAddress()) +
                      '&sensor=false';
        }

        $('#charge-amount').text(transaction.payment());
        $('#charge-datetime').text(transaction.fullDate());
        $('#charge-merchant').text(transaction.merchant);
        $('#charge-location').html(transaction.htmlAddress());
        $('#map').attr('src', map_url);
    }

    /**
     * @method display_transaction_details - display transaction details.
     * @param transaction {Transaction}
     * @see Transaction
     */
    function display_transaction_details(transaction) {
        if (transaction === null) {
            throw 'display_transaction_details: transaction is null';
        }
        if (transaction.isPayment()) {
            self.changePage('#payment-detail',     { changeHash: false });
            display_payment_details(transaction);
        } else {
            self.changePage('#transaction-detail', { changeHash: false });
            display_charge_details(transaction);
        }
    }

    grammar_handler = function (result) {
        var interpretation;

        self.log('reco result: ' + interpretation);

        if (result === null || result.length === 0) {
            self.recoError('no reco result');

        } else {
            interpretation = result[0].interpretation.toLowerCase();

            switch (interpretation) {
            case 'next':
                display_transaction_details(TransactionList.next());
                self.clearRecoErrors();
                set_grammar(null);
                break;

            case 'previous':
                display_transaction_details(TransactionList.prev());
                self.clearRecoErrors();
                set_grammar(null);
                break;

            case 'dispute':
                self.changePage('#dispute');
                break;

            case 'back to list':
                self.changePage('#recent-transactions');
                break;

            case 'chat':
                BankDemo.ChatController.setDoneButtonLink();
                self.changePage('#chat');
                break;

            default:
                self.recoError('unhandled: "' + interpretation + '"');
                break;
            }
        }

        if (self.hasRecoErrors()) {
            set_grammar(null);
            if (self.recoErrors() === 1) {
                BankDemo.prompt('rt-detail-02');
            } else {
                BankDemo.prompt('rt-detail-03');
            }
        }
    };

    function detail_init(dropdown_container_id) {
        var pages = ['transaction-detail', 'payment-detail'],
            page  = $.mobile.activePage.attr('id'),
            index = BankDemo.getUrlVar('index'),
            trans = BankDemo.getUrlVar('transaction_id'),
            ccnum = AccountData.Account.activeCcNumber();

        if ($.inArray(page, pages) > -1) {
            self.initDropdown(dropdown_container_id, true);

            $('#dispute-button').attr('href', '#dispute?cc_number=' + ccnum +
                                              '&transaction_id=' + trans);

            display_transaction_details(TransactionList.get(index));
        }
    }

    return {
        beforeShow: function () {
            self.clearRecoErrors();
            NativeBridge.setMessage(null);
            detail_init('last-4-digits-detail');
        },

        beforeShowPayments: function () {
            detail_init('last-4-digits-detail-payment');
        },

        onShow: function () {
            set_grammar(null);
            if (! self.prompted()) {
                self.setPrompted(true);
                BankDemo.prompt('rt-detail-01');
            }
        },

        onDispute: function () {
            self.changePage('#dispute');
        },

        displayTransactionDetails: display_transaction_details,

        init: function () {
            self.addCcChangeHandler(self.ccChangeHandler);
            var page = $('#transaction-detail'),
                good = 0;
            if (page.length > 0) {
                page.on('pagebeforeshow', self.beforeShow);
                page.on('pageshow', self.onShow);
                page.on('pagebeforehide', self.beforeHide);
                $('#dispute-button').on('click', self.onDispute);
                good += 1;
            }
            page = $('#payment-detail');
            if (page.length > 0) {
                page.on('pagebeforeshow', self.beforeShowPayments);
                good += 1;
            }
            $('.detail-back-button').on('click', function () {
                self.changePage('#recent-transactions');
            });
            return good === 2;
        }
    }
}(jQuery)));



BankDemo.TransactionDisputeController = new BankDemo.Controller('TransactionDisputeController');

jQuery.extend(BankDemo.TransactionDisputeController, (function ($) {
    var self = BankDemo.TransactionDisputeController,
        set_grammar,
        grammar_handler;

    set_grammar = function (message) {
        self.setGrammar(message, 'grammars/dispute.grxml', grammar_handler);
    };

    grammar_handler = function (result) {
        var interpretation;

        self.log('reco result: ' + interpretation);

        if (result === null || result.length === 0) {
            self.recoError('no reco result');

        } else {
            interpretation = result[0].interpretation.toLowerCase();

            switch (interpretation) {
            case 'back to list':
                self.changePage('#recent-transactions');
                break;

            case 'main menu':
                self.changePage('#main-menu');
                break;

            case 'continue':
                BankDemo.SurveyController.setBackButtonLink();
                self.changePage('#survey');
                break;

            case 'chat':
                BankDemo.ChatController.setDoneButtonLink();
                self.changePage('#chat');
                break;

            default:
                self.recoError('unhandled: "' + interpretation + '"');
                break;
            }
        }

        if (self.hasRecoErrors()) {
            set_grammar(null);
        }
    };

    return {
        beforeShow: function () {
            self.initDropdown('last-4-digits-dispute', true);
        },

        onShow: function () {
            set_grammar(null);
            self.clearRecoErrors();
        },

        init: function () {
            var page = $('#dispute');
            if (page.length > 0) {
                page.on('pagebeforeshow', self.beforeShow);
                page.on('pageshow',       self.onShow);
                page.on('pagebeforehide', self.beforeHide);
                $('#dispute-back-button').on('click', function () {
                    self.changePage('#transaction-detail');
                });
                $('#dispute-continue-button').on('click', function () {
                    BankDemo.SurveyController.setBackButtonLink();
                    $.mobile.changePage($('#survey'));
                });
                return true;
            }
            return false;
        }
    }
}(jQuery)));


// Payment Controller
//
//
BankDemo.PaymentController = new BankDemo.RT.Controller('PaymentController');

jQuery.extend(BankDemo.PaymentController, (function ($) {
    var self = BankDemo.PaymentController,
        set_grammar,
        grammar_handler;

    set_grammar = function (message) {
        self.setGrammar(message, 'grammars/make_payment.grxml', grammar_handler);
    };

    function update_estimated_date() {
        var date = new Date($('#pmtdate').val()),
            acct = null,
            tstamp = 0,
            datedueobj;

        if (AccountData.Account.activeCcNumber() !== null) {
            acct = AccountData.Account.getDestAccount();

            // get the pmt date and add 1 day to it
            date.addDays(1);
            $('#estdate').html(date.toShortDate());

            if (acct.datedue.match(/^-?\d+$/)) {
                tstamp = $.now() + (parseFloat(acct.datedue) * 24 * 60 * 60 * 1000) * -1;
            } else {
                tstamp = Date.parse(acct.datedue);
            }

            // check if the estimated post date is past due date
            // if so, then update background
            datedueobj = new Date(tstamp);
            if (date > datedueobj) {
                $('#estdatesection').addClass('late');
                $('#estdatelbl').addClass('late');
            } else {
                $('#estdatesection').removeClass('late');
                $('#estdatelbl').removeClass('late');
            }
        }
    }

    function change_est_date(date) {
        var date_msecs = Date.parse(date),
            date_rel   = Date.parseRelative(date),
            date_val   = null;

        if (! isNaN(date_msecs)) {
            date_val = (new Date(date_msecs)).toShortDate();
        } else if (date_rel !== null) {
            date_val = date_rel;
        }

        if (date_val !== null) {
            $('#pmtdate').val(date_val);
            update_estimated_date();
            return 1;
        }
        return 0;
    }

    function change_pay_amount(amount) {
        var payment = null;

        if (amount === 'current_balance') {
            payment = AccountData.Account.getCurrentBalance();
        } else if (amount === 'minimum_due') {
            payment = AccountData.Account.getMinimumPayment();
        } else if (amount.match(/^\d+(\.\d+)?$/)) {
            payment = amount;
        }

        if (payment !== null) {
            $('#pmtamount').val(payment.formatAsCurrency());
            return 1;
        }
        return 0;
    }

    // TODO: Replace table with divs, spans, etc.
    function populate_src_acct_info() {
        var div      = $('#src-acct-info'),
            src_acct = AccountData.Account.getSrcAccount(),
            summary  = '<table width="100%" border="0">' +
                       '<tr><td class="payment-account-label">Payment Account</td>';

        // display balance only if available
        if (src_acct.balance) {
             summary += '<td class="available-balance-label">Avail Balance</td>';
        }

        summary += '</tr><tr><td class="payment-account-data">' + src_acct.pay_from +
                   '</td>';

        // display balance only if available
        if (src_acct.balance) {
            summary += '<td class="available-balance-data">$' + src_acct.balance + '</td>';
        }
        summary += '</tr></table>';

        div.empty();
        $(summary).appendTo(div);
    }

    grammar_handler = function (result) {
        var interpretation = '',
            amount         = '',
            date           = '',
            destination    = '',
            source         = '',
            message        = null;

        self.log('reco result: ' + JSON.stringify(result));

        if (result === null || result.length === 0) {
            self.recoError('no reco result');
            set_gramar("I'm sorry, I didn't get that.")

        } else {
            interpretation = result[0].interpretation;

            switch (interpretation.SLOTS.action) {
            case 'back':
                self.changePage('#main-menu');
                break;

            case 'addsource':
                self.changePage('#acct-add');
                break;

            case 'submit':
                self.changePage('#payment-confirm');
                break;

            case 'help':
                BankDemo.ChatController.setDoneButtonLink();
                self.changePage('#chat');
                break;

            case 'pay':
                amount = interpretation.SLOTS.amount;
                source = interpretation.SLOTS.source;
                destination = interpretation.SLOTS.destination;
                date = interpretation.SLOTS.date;

                if (amount === 'none' && date === 'none' &&
                    source === 'none' && destination === 'none') {
                } else {
                    if (date !== 'none' && change_est_date(date) === 0) {
                        message = "I'm sorry, I didn't get that date.";
                    }
                    if (source !== 'none') {
                        AccountData.Account.setActiveSrcNumber(source);
                        populate_src_acct_info();
                    }
                    if (amount !== 'none' && change_pay_amount(amount) === 0) {
                        message = "I'm sorry, I didn't get that amount.";
                    }
                }
                set_grammar(message);
                break;

            case 'changesource':
                source = interpretation.SLOTS.source;
                if (source === 'none') {
                    self.changePage('#acct-from');
                } else {
                    AccountData.Account.setActiveSrcNumber(source);
                    populate_src_acct_info();
                    set_grammar(null);
                }
                break;

            case 'changedate':
                date = interpretation.SLOTS.date;
                if (date === 'none' || change_est_date(date) === 0) {
                    message = "I'm sorry, I didn't get that date.";
                }
                set_grammar(message);
                break;

            case 'changeamount':
                amount = interpretation.SLOTS.amount;
                if (amount === 'none' || change_pay_amount(amount) === 0) {
                    message = "I'm sorry, I didn't get that amount.";
                }
                set_grammar(message);
                break;
            }
        }
    }

    function set_payment_amount() {
        var acct = AccountData.Account.getDestAccount();

        // Right now sets to minimum balance if a value is set in the json
        // Otherwise sets to the current balance
        if (acct.minpmt === null) {
            $('#pmtamount').val(acct.balance);
        } else {
            $('#pmtamount').val(acct.minpmt);
        }
    }

    function set_payment_hidden_date() {
        var acct = AccountData.Account.getDestAccount(),
            date = AccountData.Utils.dateDueDatebox(acct.datedue);
        try {
            $('#pmtdatehidden').data('datebox').options.highDates = [date];
        } catch(err) {
            self.log(' ERROR set_payment_hidden_date: ' + err);
        }
        return date;
    }

    function set_default_payment_date() {
        $('#pmtdate').val( (new Date()).toShortDate() );
        update_estimated_date();
    }


    return {
        setDefaultPaymentDate: set_default_payment_date,
        populateSrcAcctInfo: populate_src_acct_info,

        beforeShow: function () {
            self.initDropdown('last-4-digits-payment', false);
        },

        onShow: function () {
            update_estimated_date();
            set_grammar(null);
            if (! self.prompted) {
                BankDemo.prompt('payment');
                self.setPrompted(true);
            }
        },

        init: function () {
            var page = $('#payment');
            if (page.length > 0) {
                page.on('pagebeforeshow', self.beforeShow);
                page.on('pageshow',       self.onShow);
                page.on('pagebeforehide', self.beforeHide);
                $('#payment-back-button').on('click', function () {
                    self.changePage('#main-menu');
                });
                $('#pmtdate, #pmtdate-a').on('click', function () {
                    $('#pmtdatehidden').datebox('open');
                });
                $('#submit-payment-button').on('click', function () {
                    self.changePage('#payment-confirm');
                });
                var payment_datebox = $('#pmtdatehidden');
                payment_datebox.bind('datebox', function(e, p) {
                    if (p.method === 'close') {
                        if (payment_datebox.val() !== '') {
                            $('#pmtdate').val(payment_datebox.val());
                            update_estimated_date();
                        }
                    }
                });
                self.addCcChangeHandler(self.ccChangeHandler);
                self.addCcChangeHandler(function () {
                    populate_src_acct_info();
                    update_estimated_date();
                    set_payment_amount();
                    set_payment_hidden_date();
                });
                set_default_payment_date();
                return true;
            }
            return false;
        }
    }
}(jQuery)));



BankDemo.PaymentAccountFromController = new BankDemo.Controller('PaymentAccountFromController');

jQuery.extend(BankDemo.PaymentAccountFromController, (function ($) {
    var self = BankDemo.PaymentAccountFromController,
        set_grammar,
        grammar_handler;

    set_grammar = function (message) {
        self.setGrammar(message, 'grammars/payment_src.grxml', grammar_handler);
    };

    grammar_handler = function (result) {
        var interpretation;

        if (result === null || result.length === 0) {
            self.recoError('no reco result');

        } else {
            self.log('reco result: ' + JSON.stringify(result));

            interpretation = result[0].interpretation;

            switch (interpretation) {
            case 'help':
                BankDemo.ChatController.setDoneButtonLink();
                self.changePage('#chat');
                break;

            case 'back':
                self.changePage('#payment');
                break;

            case 'add account':
                self.changePage('#acct-add');
                break;

            default:
                // set the new active source account
                // and then refresh the list
                AccountData.Account.set_active_src_number(interpretation);
                self.changePage('#payment');
                break;
            }
        }

        if (self.hasRecoErrors()) {
            set_grammar("I'm sorry, I didn't get that.");
        }
    };

    function account_item(account, selected) {
        var item = $('<li>'),
            span = $('<span>');

        span.text(account.pay_from);
        span.attr('class', 'available-payment-account');

        if ($.inArray(account.number, [selected, AccountData.Account.activeSrcNumber()]) < 0) {
            span.appendTo(item);
            item.on('click', function () {
                AccountData.Account.setActiveSrcNumber(account.number);
                self.changePage('#payment');
            });
        } else {
            item.attr('data-icon', 'check');
            span.appendTo( $('<a>').attr('href', '#payment').appendTo(item) )
        }
        return item;
    }

    function show_available_accounts() {
        var div = $('#list-acctfrom').empty(),
            list = $('<ul>').attr('data-role', 'listview'),
            item = $('<li>').attr('data-icon', 'plus').addClass('add-payment-account'),
            anch = $('<a>').attr('href', '#acct-add'),
            span = $('<span>').addClass('add-payment-account').text('Add New Account'),
            selected = AccountData.Account.activeSrcNumber();

        // Build the list
        div.empty();

        list.appendTo(div);

        $(AccountData.Account.getData().src_accounts).each( function(i, account) {
            account_item(account, selected).appendTo(list);
        });
        span.appendTo(anch);
        anch.appendTo(item);
        item.appendTo(list);

        list.attr('data-inset', 'true');
        list.attr('data-theme', 'c');

        list.listview();
        return list;
    }

    return {
        beforeShow: function () {
            self.initDropdown('last-4-digits-acctfrom', true)
        },

        onShow: function () {
            set_grammar(null);
            if (! self.prompted()) {
                BankDemo.prompt('acctfrom');
                self.setPrompted(true);
            }
        },

        init: function () {
            var page = $('#acct-from');
            if (page.length > 0) {
                page.on('pagebeforeshow', self.beforeShow);
                page.on('pageshow',       self.onShow);
                page.on('pagebeforehide', self.beforeHide);
                $('#acct-from-back-button').on('click', function () {
                    self.changePage('#payment');
                });
                self.addCcChangeHandler(show_available_accounts);
                return 1;
            }
            return 0;
        }
    }
}(jQuery)));


BankDemo.PaymentAccountAddController = new BankDemo.Controller('PaymentAccountAddController');

jQuery.extend(BankDemo.PaymentAccountAddController, (function ($) {
    var self = BankDemo.PaymentAccountAddController,
        set_grammar,
        grammar_handler;

    set_grammar = function (message) {
        self.setGrammar(message, 'grammars/add_account.grxml', grammar_handler);
    };

    grammar_handler = function (result) {
        var interpretation = '',
            routing_number = '',
            account_number = '';

        if (result === null || result.length === 0) {
            self.recoError('no reco result');

        } else {
            self.log('reco result: ' + JSON.stringify(result));

            interpretation = result[0].interpretation;

            switch (interpretation.SLOTS.action) {
            case 'submit':
                self.clearRecoErrors();
                self.addAccount();
                break;

            case 'add':
                routing_number = interpretation.SLOTS.routenumber;
                account_number = interpretation.SLOTS.acctnumber;

                // TODO -  should be setting within Account obj
                if (isNumber(routing_number)) {
                    self.log('add routing number: "' + routing_number + '"');
                    $('#newacctrouting').val(routing_number);
                }

                if (isNumber(account_number)) {
                    self.log('add account number: "' + account_number + '"');
                    $('#newacctnumber').val(account_number);
                }

                self.clearRecoErrors();
                set_grammar(null);
                break;

            case 'help':
                BankDemo.ChatController.setDoneButtonLink();
                self.changePage('#chat');
                break;

            case 'back':
                self.changePage('#payment');
                break;

            default:
                self.recoError('unknown action: "' + interpretation.SLOTS.action + '"');
                break;
            }
        }

        if (self.hasRecoErrors()) {
            set_grammar("I'm sorry, I didn't get that.");
        }
    };

    function add_account() {
        var acctname    = $('#newacctname').val(),
            acctrouting = $('#newacctrouting').val(),
            acctnum     = $('#newacctnumber').val();

        // check if routing number is valid
        if (!(isNumber(acctrouting) && acctrouting.length === 9)) {
            return 1;
        }

        // check account number
        if (!(isNumber(acctnum) && acctnum.length === 10)) {
            return 2;
        }

        // Add new source account and update state
        AccountData.Account.addSrcAccount(acctname, acctrouting, acctnum);
        AccountData.Account.setActiveSrcNumber(acctnum);

        // Update the srouce account informatio on the "Make a Payment" page
        BankDemo.PaymentController.populateSrcAcctInfo();

        // Clear out the "Add an account" form fields
        $('#newacctname').removeAttr('value');
        $('#newacctrouting').removeAttr('value');
        $('#newacctnumber').removeAttr('value');

        return 0;
    }

    return {
        beforeShow: function () {
            self.initDropdown('last-4-digits-acctadd', true);
        },

        onShow: function () {
            set_grammar(null);
            if (! self.prompted()) {
                BankDemo.prompt('acctadd');
                self.setPrompted(true);
            }
        },

        addAccount: function () {
            switch (add_account()) {
            case 1:
                set_grammar('Invalid routing number');
                break;
            case 2:
                set_grammar('Invalid account number');
                break;
            default:
                self.changePage('#payment');
            }
        },

        init: function () {
            var page = $('#acct-add');
            if (page.length > 0) {
                page.on('pagebeforeshow', self.beforeShow);
                page.on('pageshow',       self.onShow);
                page.on('pagebeforehide', self.beforeHide);
                $('#acct-add-back-button').on('click', function () {
                    self.changePage('#acct-from');
                });
                $('#newacctname,#newacctrouting,#newacctnumber').on('click', function () {
                    set_grammar(null);
                });
                $('#add-acct-button').on('click', self.addAccount);
                return 1;
            }
            return 0;
        }
    }
}(jQuery)));


BankDemo.PaymentConfirmController = new BankDemo.Controller('PaymentConfirmController');

jQuery.extend(BankDemo.PaymentConfirmController, (function ($) {
    var self = BankDemo.PaymentConfirmController;

    function create_confirmation() {
        $('#confirmation-number').text('TBW' + Math.floor(Math.random() * 100000001));
        $('#confirmation-pay-to').text(AccountData.Account.getPayTo() );
        $('#confirmation-pay-from').text(AccountData.Account.getPayFrom() );
        $('#confirmation-pay-amount').text('$' + $('#pmtamount').val());
        $('#confirmation-pay-date').text($('#pmtdate').val());
        $('#confirmation-post-date').text($('#estdate').html());
    }

    return {
        beforeShow: function () {
            self.unsetGrammar();
            self.initDropdown('last-4-digits-confirm', true);
        },

        onShow: function () {
            create_confirmation();
        },

        init: function () {
            var page = $('#payment-confirm');
            if (page.length > 0) {
                page.on('pagebeforeshow', self.beforeShow);
                page.on('pageshow',       self.onShow);
                $('#payment-confirm-back-button').on('click', function () {
                    BankDemo.PaymentController.setDefaultPaymentDate();
                    self.changePage('#payment');
                });
                $('#payment-confirm-continue-button').on('click', function () {
                    BankDemo.PaymentController.setDefaultPaymentDate();
                    BankDemo.SurveyController.setBackButtonLink();
                    self.changePage('#survey');
                });
                return 1;
            }
            return 0;
        }
    }
}(jQuery)));


// Survey Controller
//
// Sets up the "click to rate" functionality and focuses the feedback
// field.
BankDemo.SurveyController = new BankDemo.Controller('SurveyController');

jQuery.extend(BankDemo.SurveyController, (function ($) {
    var self = BankDemo.SurveyController,
        set_grammar,
        grammar_handler;

    set_grammar = function (message) {
        self.setGrammar(message, 'grammars/survey.grxml', grammar_handler);
    };

    grammar_handler = function (result) {
        var interpretation;

        if (result === null || result.length === 0) {
            self.recoError('no reco result');

        } else {
            self.log('reco result: ' + JSON.stringify(result));

            interpretation = result[0].interpretation.toLowerCase();

            switch (interpretation) {
            case 'main menu':
            case 'submit':
                self.changePage('#main-menu');
                break;

            case 'chat':
                BankDemo.ChatController.setDoneButtonLink();
                self.changePage('#chat');
                break;

            default:
                self.recoError('unhandled: "' + interpretation + '"');
                break;
            }
        }

        if (self.hasRecoErrors()) {
            set_grammar("I'm sorry, I didn't get that.");
        }
    };

    function reset_rating() {
        $('.rating li span').removeClass('star-act').addClass('star');
        $('#survey-feedback').val('');
    }

    function initialize_stars() {
        $('#survey ul.rating li').on('click', function () {
            var vid = parseInt( this.firstChild.id.replace('s-', '') );
            for (var i = 0; i < 5; i += 1) {
                var star = $('#s-' + i);
                if (i <= vid) {
                    star.removeClass('star').addClass('star-act');
                } else {
                    star.removeClass('star-act').addClass('star');
                }
            }
        });
    }

    return {
        back_button_page: '#main-menu',

        setBackButtonLink: function () {
            self.back_button_page = '#' + $.mobile.activePage.attr('id');
            return self;
        },

        beforeShow: function () {
            self.clearRecoErrors();
            self.unsetGrammar();
        },

        onShow: function () {
            reset_rating();
            $('#survey-feedback').focus();
        },

        init: function () {
            var page = $('#survey');
            if (page.length > 0) {
                page.on('pagebeforeshow', self.beforeShow);
                page.on('pageshow',       self.onShow);
                $('#survey-back-button').on('click', function () {
                    self.changePage(self.back_button_page);
                });
                initialize_stars()
                return true;
            }
            return false;
        }
    }
}(jQuery)));



// Chat Controller
//
// Initialize the chat page
BankDemo.ChatController = new BankDemo.Controller('ChatController');

jQuery.extend(BankDemo.ChatController, (function ($) {
    var self = BankDemo.ChatController;

    return {
        done_button_page: '#main-menu',

        setChatBubbleImage: function(type) {
            var bubble = $('.chat-bubble');
            switch (type) {
            case 'payments':
                bubble.attr('src', 'img/payments-chat.png');
                break;
            case 'charges':
                bubble.attr('src', 'img/charges-chat.png');
                break;
            }
            return self;
        },

        setDoneButtonLink: function() {
            self.done_button_page = '#' + $.mobile.activePage.attr('id');
            return self;
        },

        onShow: function () {
            self.unsetGrammar();
        },

        init: function () {
            var page = $('#chat');
            if (page.length > 0) {
                page.on('pageshow', self.onShow);
                $('#chat-done-button').on('click', function () {
                    self.changePage(self.done_button_page);
                });
                return true;
            }
            return false;
        }
    }
}(jQuery)));



// Application Controller
//
// Initialize the application
BankDemo.ApplicationController = new BankDemo.Controller('Application');

jQuery.extend(BankDemo.ApplicationController, (function ($) {
    return {
        load: function () {
        },

        init: function () {
            NativeBridge.onInitialize(function () {});
            AccountData.Account.init(BankDemo.AccountNumber);
            BankDemo.MainMenuController.init();
            BankDemo.RecentTransactionsController.init();
            BankDemo.TransactionDetailController.init();
            BankDemo.TransactionDisputeController.init();
            BankDemo.PaymentController.init();
            BankDemo.PaymentAccountFromController.init();
            BankDemo.PaymentAccountAddController.init();
            BankDemo.PaymentConfirmController.init();
            BankDemo.SurveyController.init();
            BankDemo.ChatController.init();
        }
    }
}(jQuery)));


function dispute() {
    $.mobile.changePage($('#dispute'));
}
function  survey() {
    BankDemo.SurveyController.setBackButtonLink();
    $.mobile.changePage($('#survey'));
}
function    chat() {
    BankDemo.ChatController.setDoneButtonLink();
    $.mobile.changePage($('#chat'));
}

function utter(obj) {
    NativeBridge._setGrammarResult([{
        'name': 'grammar',
        'confidence': '0.7437955',
        'interpretation': obj
    }]);
}

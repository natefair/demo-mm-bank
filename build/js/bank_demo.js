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
var BankDemo = (function ($) {
    /**
     * Return the href query (a.k.a search) string.
     *
     * Note that jQuery Mobile doesn't support query parameter passing
     * to internal/imbedded pages, so the query string is appended to the
     * hash value (e.g. "#somePage?someId=1")
     *
     * @method get_url_search
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
        AccountNumber: 2,

        Prompts: {
            'mainmenu':     'audio/MainMenu.wav',
            'payment':      'audio/MakeAPayment.wav',
            'acctfrom':     'audio/SelectPaymentAccount.wav',
            'acctadd':      'audio/AddNewAccount.wav',
            'rt-01':        'audio/RT_RecentTransactions_01.wav',
            'rt-02':        'audio/RT_RecentTransactions_02.wav',
            'rt-03':        'audio/RT_RecentTransactions_03.wav',
            'rt-detail-01': 'audio/RT_TransactionDetails_01.wav',
            'rt-detail-02': 'audio/RT_TransactionDetails_02.wav',
            'rt-detail-03': 'audio/RT_TransactionDetails_03.wav'
        },

        getUrlVar: function (name) { 
            var params = $.grep(get_url_search(), function (param) {
                return param.indexOf('=') > 0 && param.split('=')[0] === name;
            });
            if (params.length === 1) {
                return params[0].split('=')[1];
            }
            return null;
        },

        log: function (msg) {
            NativeBridge.log(msg);
            if (console && console.log) {
                console.log(msg);
                return 1;
            }
            return 0;
        },

        prompt: function (page) {
            if (typeof BankDemo.Prompts[page] !== 'undefined') {
                NativeBridge.playAudio(BankDemo.Prompts[page]);
                return true;
            }
            BankDemo.log('[prompt] cannot find WAV for "' + screen + '"');
            return false;
        }
    }
}(jQuery));


// Recent Transaction Specific Configuration
BankDemo.RT = (function ($) {
    var root_url = $.mobile.path.get(window.location.href),
        dynamic;

    dynamic = root_url.replace('/content/', '/perl/') +
              'grammars/dynamicgram.pl';

    return {
        merchantDelim: function () {
            return '<DELIM>';
        },
        getRootUrl: function () {
            return root_url;
        },
        getDynamicGrammarUrl: function () {
            return dynamic;
        }
    }
}(jQuery));

/**
 * BankDemo Controller Class - from which all other controllers will be
 * an instance of and are expecte to extend.
 */
BankDemo.Controller = function (name) {
    name = name || 'Controller';
    this.setLoggingPrefix(name);
    this.setPrompted(false);
    this.clearRecoErrors();
    this._cc_change_handlers = $([]);
};

BankDemo.Controller.prototype = (function ($) {
    return {
        /**
         * Logging prefix setter
         *
         * @method setLoggingPrefix
         * @param  {String}  prefix  The logging prefix.
         */
        setLoggingPrefix: function (prefix) {
            this._l_prefix = prefix;
            return this;
        },

        /**
         * Logging method for debugging.
         *
         * @method log
         * @param  {String}  msg  The message to log.
         */
        log: function (msg) {
            return BankDemo.log(this._l_prefix + ': ' + msg);
        },

        /**
         * Clear recognition errors counter.
         *
         * @method clearRecoErrors
         */
        clearRecoErrors: function () {
            this._rec_errs = 0;
            return this;
        },

        /**
         * Increment the recognition errors counter and log the given messa
         *
         * @method recoError
         * @param  {String}  msg  The message to log.
         */
        recoError: function (msg) {
            this._rec_errs += 1;
            return this.log(msg);
        },

        recoErrors: function () {
            return this._rec_errs;
        },

        /**
         * Checks for recognition errors.
         *
         * @method hasRecoErrors
         * @return {Boolean}  true if there are recognition errors recorded
         */
        hasRecoErrors: function () {
            this.log('recoErrors: ' + this._rec_errs);
            return this._rec_errs > 0;
        },

        /**
         * Change the page to the page with the given page ID.
         *
         * @method changePage
         * @param  {String}  page  The page ID to change to, e.g. '#main'
         */
        changePage: function (page) {
            this.clearRecoErrors();
            $.mobile.changePage($(page));
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
            NativeBridge.setMessage(message);
            NativeBridge.setGrammar(grammar, null, handler);
        },

        beforeHide: function () {
            NativeBridge.cancelAudio();
            return false;
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

        initDropdown: function (dropdown_id, is_inactive) {
            if (is_inactive) {
                AccountData.account.initDropdown(dropdown_id, true);
            } else {
                AccountData.account.initDropdown(dropdown_id, false, this.ccChangeHandlers());
            }
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
        BankDemo.log('init_payment_options');
        var div = $('#list-payment-amount'),
            cur_balance,
            min_payment,
            list;

        div.empty();

        // get the current balance and minumum payment values
        var cur_balance = AccountData.account.get_current_balance();
        var min_payment = AccountData.account.get_minimum_payment();

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
            var balance = AccountData.account.get_current_balance();
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

    function set_default_payment_date() {
        $('#pmtdate').val( (new Date()).toShortDate() );
    }

    // TODO figure out how to get this out of AccountData.account.listCards
    function populate_payment_due() {
        BankDemo.log('populate_payment_due');
        var acct = AccountData.account.getDestAccount(),
            date = AccountData.Utils.dateDue(acct.datedue)

        // set values in main menu
        $('.card-type').text(acct.name);
        $('.payment-due-date').text(date);
        return date;
    }

    return {
        initPaymentOptions: init_payment_options,

        setDefaultPaymentDate: set_default_payment_date,

        populatePaymentDue: populate_payment_due,

        dynamicGrammarUrl: function(type) {
            var merchants = AccountData.transactions.getMerchants();
            merchants = merchants.join( BankDemo.RT.merchantDelim() );

            return BankDemo.RT.getDynamicGrammarUrl() +
                   '?type' + type + '&merchants=' + 
                   encodeURIComponent(merchants);
        },

        ccChangeHandler: function (dropdown, data) {
            // Callback sets onchange handler for dropdown
            dropdown.on('change', function () {
                BankDemo.log('ccChangeHandler fired for '+$(this).parents('.card-info').attr('id'));
                init_payment_options();
                set_default_payment_date();
                populate_payment_due();
                TransactionList.init();
            });
            BankDemo.log('ccChangeHandler calling change on dropdown');
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
        grammar_handler;

    grammar_handler = function (result) {
        var interpretation;

        self.log(JSON.stringify(result));

        if (result === null || result.length === 0) {
            set_grammar('What?');

        } else {
            interpretation = result[0].interpretation;

            switch (interpretation.action) {
            case 'make payment':
                $.mobile.changePage($('#payment'));
                break;

            case 'no':
                set_grammar('How can I help you today?');
                break;

            default:
                self.log('unknown action: "' + interpretation.action + '"');
                set_grammar("I'm sorry, I didn't get that.");
                break;
            }
        }
    }

    set_grammar = function (message) {
        self.setGrammar(message, 'grammars/mainmenu.grxml', grammar_handler);
    }

    return {
        beforeShow: function () {
            TransactionList.clearFilters();
        },

        onShow: function () {
            self.initDropdown('last-4-digits-main', false);
            set_grammar('Would you like to make a payment?');
            if (! self.prompted()) {
                BankDemo.prompt('mainmenu');
                self.setPrompted(true);
            }
        },

        init: function () {
            self.addCcChangeHandler(self.ccChangeHandler);
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

    grammar_handler = function (result) {
        if (result != null && result.length > 0) {
            var interp = result[0].interpretation;
            var action = interp.action.toLowerCase();
            self.log('reco result: "' + action + '"');

            if (action === 'sort') {
                self.log('sort' + ', field: ' + interp.field +
                                  ', order: ' + interp.order);

                self.clearRecoErrors();
                TransactionList.sort(interp.field.toLowerCase(),
                                     interp.order.toLowerCase());
                set_grammar(null)

            } else if (action === 'filter') {
                self.log('filter' + ', field: '      + interp.field +
                                    ', comparison: ' + interp.comparison +
                                    ', value: '      + interp.value);

                var field = interp.field.toLowerCase();
                var comparison = interp.comparison.toLowerCase();
                var value = interp.value;

                if (field === 'date') {
                    value = parseFloat(value);
                    self.log('date: ' + (new Date(value)).toLocaleString());
                    TransactionList.filterByDate(value, comparison);

                } else if (field === 'merchant') {
                    TransactionList.filterByMerchant(value);

                } else if (field === 'amount') {
                    TransactionList.filterByAmount(value, comparison);
                }

                self.clearRecoErrors();
                set_grammar(null);

            } else if (action === 'detail') {
                self.log('detail, idx: ' + interp.idx);

                TransactionList.showTransaction(parseInt(interp.idx));
                self.changePage('#transaction-detail');

            } else if (action === 'chat') {
                BankDemo.ChatController.setDoneButtonLink();
                self.changePage('#chat');

            } else {
                self.recoError('unhandled action: "' + action + '"');
            }
        } else {
            self.recoError('no reco result');
        }

        if (self.hasRecoErrors()) {
            set_grammar(null);
            if (self.reco_errors() === 1) {
                BankDemo.prompt('rt-02');
            } else {
                BankDemo.prompt('rt-03');
            }
        }
    };

    function go_back() {
        TransactionList.clearFilters();
        self.changePage('#main-menu');
    };

    return {
        beforeShow: function () {
            //self.log('beforeShow');
            self.clearRecoErrors();
            set_grammar(null);
        },

        onShow: function () {
            //self.log('onShow');
            if (! self.prompted()) {
                BankDemo.prompt('rt-01');
                self.setPrompted(true);
            }
            self.initDropdown('last-4-digits-recent-transactions', false);
            $('#charges-list').listview('refresh');
        },

        init: function () {
            self.addCcChangeHandler(self.ccChangeHandler);
            var page = $('#recent-transactions');
            if (page.length > 0) {
                page.on('pagebeforeshow', self.beforeShow);
                page.on('pageshow',       self.onShow);
                page.on('pagebeforehide', self.beforeHide);
                $('#back-to-main').on('click', go_back);
                TransactionList.setFilterButtonCallback( set_grammar );
                return true;
            };
            return false;
        }
    };
}(jQuery)));


BankDemo.TransactionDetailController = new BankDemo.RT.Controller('TransactionDetailController');

jQuery.extend(BankDemo.TransactionDetailController, (function ($) {
    var self = BankDemo.TransactionDetailController,
        set_grammar,
        grammar_handler,
        type = 'recenttransactions';

    set_grammar = function (message) {
        self.setGrammar(message, 'grammars/transactiondetail.grxml', grammar_handler);
    };

    grammar_handler = function (result) {
        if (result != null && result.length > 0) {
            var interpretation = result[0].interpretation.toLowerCase();
            self.log('reco result: ' + interpretation);

            switch (interpretation) {
            case 'next':
                self.clearRecoErrors();
                set_grammar();
                TransactionList.showNextTransaction();
                break;

            case 'previous':
                self.clearRecoErrors();
                set_grammar();
                TransactionList.showPrevTransaction();
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
        } else {
            self.recoError('no reco result');
        }

        if (self.hasRecoErrors()) {
            set_grammar();
            if (self.reco_errors === 1) {
                BankDemo.prompt('rt-detail-02');
            } else {
                BankDemo.prompt('rt-detail-03');
            }
        }
    };

    function detail_init (dropdown_container_id) {
        var pages = ['transaction-detail', 'payment-detail'],
            page  = $.mobile.activePage.attr('id'),
            index = BankDemo.getUrlVar('index'),
            trans = BankDemo.getUrlVar('transaction_id'),
            ccnum = AccountData.account.active_cc_number();

        if ($.inArray(page, pages) > -1) {
            self.initDropdown(dropdown_container_id, true);

            $('#dispute-button').attr('href', '#dispute?cc_number=' + ccnum +
                                              '&transaction_id=' + trans);

            TransactionList.showTransaction(index);
        }
    }

    return {
        beforeShow: function () {
            detail_init('last-4-digits-detail');
            self.clearRecoErrors();
            NativeBridge.setMessage(null);
            set_grammar();
        },

        beforeShowPayments: function () {
            detail_init('last-4-digits-detail-payment');
        },

        onShow: function () {
            if (! self.prompted()) {
                self.setPrompted(true);
                BankDemo.prompt('rt-detail-01');
            }
        },

        onDispute: function () {
            self.changePage('#dispute');
        },

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

    grammarHandler = function (result) {
        if (result != null && result.length > 0) {
            var interpretation = result[0].interpretation.toLowerCase();
            self.log('reco result: ' + interpretation);

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
        } else {
            self.recoError('no reco result');
        }

        if (self.hasRecoErrors()) {
            set_grammar();
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
BankDemo.PaymentController = new BankDemo.Controller('PaymentController');

jQuery.extend(BankDemo.PaymentController, (function ($) {
    var self = BankDemo.PaymentController,
        set_grammar,
        grammar_handler;

    set_grammar = function (message) {
        self.setGrammar(message, 'grammars/make_payment.grxml', grammar_handler);
    };

    function update_estimated_date() {
        var date = new Date($('#pmtdate').val()),
            acct = AccountData.account.getDestAccount(),
            tstamp = 0,
            datedueobj;

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
            //AccountData.account.updateEstDate();
            return 1;
        }
        return 0;
    }

    function change_pay_amount(amount) {
        var payment = null;

        if (amount === 'current_balance') {
            payment = AccountData.account.get_current_balance();
        } else if (amount === 'minimum_due') {
            payment = AccountData.account.get_minimum_payment();
        } else if (amount.match(/^\d+(\.\d+)?$/)) {
            payment = amount;
        }

        if (payment !== null) {
            $('#pmtamount').val(payment.formatAsCurrency());
            return 1;
        }
        return 0;
    }

    function populate_src_acct_info() {
        var div      = $('#src-acct-info'),
            src_acct = AccountData.account.getSrcAccount(),
            summary  = '<table width="100%" border="0">' +
                       '<tr><td class="payment-account-label">Payment Account</td>';

        // display balance only if available
        if (src_acct.balance != null) {
             summary += '<td class="available-balance-label">Avail Balance</td>';
        }

        summary += '</tr><tr><td class="payment-account-data">' + src_acct.name +
                   ' ... ' + src_acct.number.slice(-4) + '</td>';

        // display balance only if available
        if (src_acct.balance != null) {
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

        self.log('[MakeAPayment] ' + JSON.stringify(result));

        if (result === null || result.length === 0) {
            set_grammar('What?');
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
                        AccountData.account.set_active_src_number(source);
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
                    AccountData.account.set_active_src_number(source);
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
        var acct = AccountData.account.getDestAccount();

        // Right now sets to minimum balance if a value is set in the json
        // Otherwise sets to the current balance
        if (acct.minpmt === null) {
            $('#pmtamount').val(acct.balance);
        } else {
            $('#pmtamount').val(acct.minpmt);
        }
    }

    function set_payment_hidden_date() {
        var acct = AccountData.account.getDestAccount(),
            date = AccountData.Utils.dateDueDatebox(acct.datedue);
        try {
            $('#pmtdatehidden').data('datebox').options.highDates = [date];
        } catch(err) {
            BankDemo.log(' ERROR set_payment_hidden_date: ' + err);
        }
        return date;
    }

    return {
        populateSrcAcctInfo: populate_src_acct_info,

        beforeShow: function () {
            self.initDropdown('last-4-digits-payment', false);
            populate_src_acct_info();
            self.setDefaultPaymentDate();
            set_payment_amount();
            set_payment_hidden_date();
        },

        onShow: function () {
            set_grammar(null);
            if (! self.prompted) {
                BankDemo.prompt('payment');
                self.setPrompted(true);
            }
        },

        init: function () {
            self.addCcChangeHandler(self.ccChangeHandler);
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
        self.setGrammar(message, 'grammars/make_payment.grxml', grammar_handler);
    };

    grammar_handler = function (result) {
        var interpretation;

        self.log(JSON.stringify(result));

        if (result === null || result.length === 0) {
            acctfrom_setGrammar('What?');

        } else {
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
                AccountData.account.set_active_src_number(interpretation);
                self.changePage('#payment');
                break;
            }
        }
    };

    function account_item(name, number, selected) {
        var item = $('<li>'),
            span = $('<span>');

        span.text(name + ' ... ' + number.slice(-4));
        span.attr('class', 'available-payment-account');

        if ($.inArray(number, [selected, AccountData.account.active_src_number()]) < 0) {
            span.appendTo(item);
            item.on('click', function () {
                AccountData.account.set_active_src_number(number);
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
            selected = AccountData.account.active_src_number();

        // Build the list
        div.empty();

        list.appendTo(div);

        $(AccountData.account.getData().src_accounts).each( function(i, acct) {
            account_item(acct.name, acct.number, selected).appendTo(list);
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
            show_available_accounts();
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

    grammmar_handler = function (result) {
        var interpretation = '',
            routing_number = '',
            account_number = '';

        self.log(JSON.stringify(result));

        if (result === null || result.length === 0) {
            set_grammar('What?');

        } else {
            interpretation = result[0].interpretation;

            switch (interpretation.SLOTS.action) {
            case 'submit':
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
                self.log('unknown action: "' + interpretation.SLOTS.action + '"');
                set_grammar('What?');
                break;
            }
        }
    };

    function add_account() {
        var acctname    = $('#newacctname').val(),
            acctrouting = $('#newacctrouting').val(),
            acctnum     = $('#newacctnumber').val();

        // check if routing number is valid
        if (!(isNumber(acctrouting) && acctrouting.length == 9)) {
            return 1;
        }

        // check account number
        if (!(isNumber(acctnum) && acctnum.length == 10)) {
            return 2;
        }

        AccountData.account.getData().src_accounts.push({
            name:    acctname,
            routing: acctrouting,
            number:  acctnum
        });
        AccountData.account.setActiveSrcNumber(acctnum);
        BankDemo.PaymentController.populateSrcAcctInfo();

        // Clear out the fields
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
            switch (AccountData.account.addAcct()) {
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
        var pay_to   = AccountData.account.getDestAccountName() +
                 ' ' + AccountData.account.getClientCardPrefix() +
                 ' ' + AccountData.account.getDestAccountNumberShort(),
            pay_from = AccountData.account.getSrcAccountName() + ' ... ' +
                       AccountData.account.getSrcAccountNumberShort();

        $('#confirmation-number').text('TBW' + Math.floor(Math.random() * 100000001));
        $('#confirmation-pay-to').text( pay_to );
        $('#confirmation-pay-from').text( pay_from );
        $('#confirmation-pay-amount').text( $('#pmtamount').val() );
        $('#confirmation-pay-date').text( $('#pmtdate').val() );
        $('#confirmation-post-date').text( $('#estdate').html() );
    }

    return {
        beforeShow: function () {
            self.unsetGrammar();
            self.initDropdown('last-4-digits-confirm', true);
        },

        onShow: function () {
            create_confirmation();
            //AccountData.account.createConfirmationMsg();
        },

        init: function () {
            var page = $('#payment-confirm');
            if (page.length > 0) {
                page.on('pagebeforeshow', self.beforeShow);
                page.on('pageshow',       self.onShow);
                //page.on('pagebeforeshow', self.beforeShow);
                $('#payment-confirm-back-button').on('click', function () {
                    self.changePage('#payment');
                });
                $('#payment-confirm-continue-button').on('click', function () {
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
    var self = BankDemo.SurveyController;

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
            NativeBridge.onInitialize(function () {});
        },

        init: function () {
            AccountData.account.init(BankDemo.AccountNumber);
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

describe('js/transactions.js', function () {

  describe('Transaction', function () {
    var charge, payment, transaction;

    beforeEach(function () {
      charge = {
        'id':      1234,
        'name':    'Test Name',
        'address': '123 Main St.',
        'city':    'Anywhere',
        'state':   'Ohio',
        'zipcode': '54321',
        'amount':  '$23.57',
        'dow':     'Sun',
        'day':     '18',
        'month':   'Apr',
        'year':    '2010',
        'time':    '17:35',
        'zone':    'CST'
      };
      transaction = new Transaction(charge);
    });
    it('locationShort returns "Anywhere, Ohio"', function () {
      expect(transaction.locationShort()).toBe('Anywhere, Ohio');
    });
    it('location returns "Anywhere, Ohio 54321"', function () {
      expect(transaction.location()).toBe('Anywhere, Ohio 54321');
    });
    it('fullAddress returns "123 Main St., Anywhere, Ohio 54321"', function () {
      expect(transaction.fullAddress()).toBe('123 Main St., Anywhere, Ohio 54321');
    });
    it('htmlAddress returns "123 Main St.<br />Anywhere, Ohio 54321"', function () {
      expect(transaction.htmlAddress()).toBe('123 Main St.<br />Anywhere, Ohio 54321');
    });
    it('dowMonth returns "Sun, Apr"', function () {
      expect(transaction.dowMonth()).toBe('Sun, Apr');
    });
    it('fullDate returns "Sun, Apr 18, 2010 17:35 CST"', function () {
      expect(transaction.fullDate()).toBe('Sun, Apr 18, 2010 17:35 CST');
    });

    describe('Charge handling', function () {
      it('isPayment returns false', function () {
        expect(transaction.isPayment()).toBeFalsy();
      });

      it('payment returns "$23.57"', function () {
        expect(transaction.payment()).toBe('$23.57');
      });
    });

    describe('Payment handling', function () {
      var payment, xaction;
      beforeEach(function () {
        payment = {
          'id':      2263,
          'name':    'Payment',
          'address': '',
          'city':    '',
          'state':   '',
          'zipcode': '',
          'amount':  '-$726.81',
          'daysago': 26,
          'time':    '23:12',
          'zone':    'PDT'
        };
        xaction = new Transaction(payment);
      });

      it('isPayment returns true', function () {
        expect(xaction.isPayment()).toBeTruthy();
      });

      it('payment returns "$726.81"', function () {
        expect(xaction.payment()).toBe('$726.81');
      });
    });

  });

  describe('TransactionFilter', function () {
    var filter;

    beforeEach(function () {
      filter = TransactionFilter;
    });

    describe('addAmountFilter', function () {
      it('adds an amount filter and amount filter is correct', function () {
        filter.addAmountFilter('10.00', 'over');
        expect(filter.amount).toEqual(['10.00', 'over']);
      });
    });
    describe('addDateFilter', function () {
      it('adds a date filter and date filter is correct', function () {
        var now = Date.now();
        filter.addDateFilter(now, 'after');
        expect(filter.date).toEqual([now, 'after']);
      });
    });
    describe('addMerchantFilter', function () {
      it('adds a merchant filter and merchant filter is correct', function () {
        filter.addMerchantFilter('merchant');
        expect(filter.merchant).toEqual(['merchant']);
      });
    });
    describe('addSortFilter', function () {
      it('adds a sort filter and sort filter is correct', function () {
        filter.addSortFilter('merchant', 'desc');
        expect(filter.sort).toEqual(['merchant', 'desc']);
      });
    });
    describe('updateFilter', function () {
      it('updates filters correctly', function () {
        filter.updateFilter('sort', ['amount', 'asc']);
        expect(filter.sort).toEqual(['amount', 'asc']);
      });
    });
    describe('removeFilter', function () {
      it('removes filters correctly', function () {
        filter.removeFilter('sort');
        expect(filter.sort).toEqual([]);
      });
    });
  });

});

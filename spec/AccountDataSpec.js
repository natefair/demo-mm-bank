describe('js/acctdata.js', function () {

  describe('Account Class', function () {
    var bank_account, cc_account, cc_no_minpmt;

    beforeEach(function () {
      bank_account = new Account({
        name:    'Test Bank',
        number:  '9998887776',
        routing: '000111234'
      });
      cc_account = new Account({
        name:    'Plastic Card',
        number:  '9999888876543210',
        balance: '1234.56',
        datedue: '-5',
        minpmt:  '55.00'
      });
      cc_no_minpmt = new Account({
        name:    'Plastic Card',
        number:  '9999888876543211',
        balance: '1234.56',
        datedue: '-10',
      });
    });

    describe('card_digits', function () {
      it('returns "7776"', function () {
        expect(bank_account.card_digits).toBe('7776');
      });
    });
    describe('card_display', function () {
      it('returns "+++3210"', function () {
        expect(cc_account.card_display).toBe('+++3210');
      });
    });
    describe('pay_from', function () {
      it('returns "Plastic Card ... 3210"', function () {
        expect(cc_account.pay_from).toBe('Plastic Card ... 3210');
      });
    });
    describe('pay_to', function () {
      it('returns "Test Bank +++ 7776"', function () {
        expect(bank_account.pay_to).toBe('Test Bank +++ 7776');
      });
    });
    describe('minpmt', function () {
      it('returns default of "20.00" for minpmt', function () {
        expect(cc_no_minpmt.minpmt).toBe('20.00');
      });
      it('returns "55.00" for minpmt', function () {
        expect(cc_account.minpmt).toBe('55.00');
      });
    });
  })


  describe('AccountData.Utils Module', function () {
    var tstamp, date, obj;

    beforeEach(function () {
      tstamp = Date.parse('Friday June 1, 2012 08:13:14');
      date   = new Date(tstamp);
      obj    = AccountData.Utils.timestampToObject(tstamp);
    });

    describe('timestampToObject', function () {
      it('returns an object with day set to 1', function () {
        expect(obj.day).toEqual(1);
      });
      it('returns an object with dow set to "Fri"', function () {
        expect(obj.dow).toEqual('Fri');
      });
      it('returns an object with month set to "Jun"', function () {
        expect(obj.month).toEqual('Jun');
      });
      it('returns an object with year set to 2012', function () {
        expect(obj.year).toEqual(2012);
      });
      it('returns an object with mm set to "06"', function () {
        expect(obj.mm).toEqual('06');
      });
      it('returns an object with dd set to "01"', function () {
        expect(obj.dd).toEqual('01');
      });
      it('returns an object with hh:mm:ss set to "08:13:14"', function () {
        expect(obj.hhmmss).toEqual('08:13:14');
      });
      it('returns an object with hours set to "08"', function () {
        expect(obj.hours).toEqual('08');
      });
      it('returns an object with minutes set to "13"', function () {
        expect(obj.minutes).toEqual('13');
      });
      it('returns an object with seconds set to "14"', function () {
        expect(obj.seconds).toEqual('14');
      });
    });

    describe('transactionDate', function () {
    });

    describe('transactionDateObject', function () {
    });

    describe('merchantDecode', function () {
      it('returns "Starbuck\'s Coffee" from "Starbuck&apos;s Coffee"', function () {
        expect(AccountData.Utils.merchantDecode('Starbuck&apos;s Coffee'))
          .toEqual("Starbuck's Coffee");
      });
    });

    describe('dateDue', function () {
      it('returns tommorow\'s date from "-1"', function () {
        var when, date;
        when = AccountData.Utils.timestampToObject((new Date()).addDays(1).getTime());
        date = when.month + ' ' + when.day + ', ' + when.year;
        expect(AccountData.Utils.dateDue('-1')).toEqual(date);
      });

      it('returns "Jun 2, 2012" from "Saturday June 2, 2012"', function () {
        expect(AccountData.Utils.dateDue('Saturday June 2, 2012')).toEqual('Jun 2, 2012');
      });
    });

    describe('dateDueDatebox', function () {
      it('returns tommorow\'s date from "-1"', function () {
        var yyyy, mm, dd, when, date;
        when = (new Date()).addDays(1);
        yyyy = when.getFullYear();
        mm   = when.getMonth() + 1;
        mm   = (mm < 10) ? '0' + mm : '' + mm;
        dd   = when.getDate();
        dd   = (dd < 10) ? '0' + dd : '' + dd;
        date = [yyyy, mm, dd].join('-');
        expect(AccountData.Utils.dateDueDatebox('-1')).toEqual(date);
      });

      it('returns "2012-06-02" from "Sat Jun 2, 2012"', function () {
        expect(AccountData.Utils.dateDueDatebox('Sat Jun 2, 2012')).toEqual('2012-06-02');
      });
    });

  });
});

describe('js/extensions.js', function () {

  // Date.addDays extension
  describe('Date.addDays', function () {
    it('adds 1 to 31 days to the current date', function () {
      var now = Date.now(), date, msec, days;
      for (days = 1; days <= 31; days += 1) {
        date = new Date(now);
        msec = date.getTime();
        expect(date.addDays(days).getTime()).toEqual(msec + days * 24 * 60 * 60 * 1000);
      }
    });
  });

  // Date.toShortDate extension
  describe('Date.toShortDate', function () {
    it('returns "Jan 1, 1970" for "01/01/1970"', function () {
      var date = new Date(Date.parse('01/01/1970'));
      expect(date.toShortDate()).toEqual('Jan 1, 1970');
    });
  });

  // Date.getDayOfWeek extension
  describe('Date.getDayOfWeek', function () {
    it('returns "Monday" for "Aug 1, 2011"', function () {
      var date = new Date(Date.parse('Aug 1, 2011'));
      expect(date.getDayOfWeek()).toEqual('Monday');
    });
  });

  // Date.getDOW extension
  describe('Date.getDOW', function () {
    it('returns "Mon" for "Aug 1, 2011"', function () {
      var date = new Date(Date.parse('Aug 1, 2011'));
      expect(date.getDOW()).toEqual('Mon');
    });
  });

  // Date.getMonthLong extension
  describe('Date.getMonthLong', function () {
    it('returns "August" for "Aug 1, 2011"', function () {
      var date = new Date(Date.parse('Aug 1, 2011'));
      expect(date.getMonthLong()).toEqual('August');
    });
  });

  // Date.getMonthShort extension
  describe('Date.getMonthShort', function () {
    it('returns "Aug" for "August 1, 2011"', function () {
      var date = new Date(Date.parse('August 1, 2011'));
      expect(date.getMonthShort()).toEqual('Aug');
    });
  });

  // Date.parseRelative extension
  describe('Date.parseRelative', function () {
    it('returns today\'s short date for "today"', function () {
      var today = new Date();
      expect(Date.parseRelative('today')).toEqual(today.toShortDate());
    });
    it('returns tomorrowi\'s short date for "tomorrow"', function () {
      var today = new Date();
      expect(Date.parseRelative('tomorrow')).toEqual(today.addDays(1).toShortDate());
    });
    it('returns the day after tomorrow\'s short date for "the day after"', function () {
      var today = new Date();
      expect(Date.parseRelative('the day after')).toEqual(today.addDays(2).toShortDate());
    });
    it('returns "Jul 1, <year>" for "07/01"', function () {
      var today = (new Date()).getFullYear();
      expect(Date.parseRelative('07/01')).toEqual('Jul 1, ' + today);
    });
  });

  // String.isNumber extension
  describe('String.isNumber', function () {
    it('says that floats are numbers', function () {
      var arr = ['0.01', '1.23', '-100.05', '123.4567'], i;
      for (i = 0; i < arr.length; i += 1) {
        expect(arr[i].isNumber()).toBe(true);
      }
    });
    it('says "Hello" is not a number', function () {
       expect('Hello'.isNumber()).toBe(false);
    });
    it('says "2012/06/05" is not a number', function () {
       expect('2012/06/05'.isNumber()).toBe(false);
    });
  });

  // Number.formatAsCurrency extension
  describe('Number.formatAsCurrency', function () {
    it('converts 14.9 to "14.90"', function () {
      expect(14.9.formatAsCurrency()).toBe('14.90');
    });
    it('converts -5.2 to "-5.20"', function () {
      expect((-5.2).formatAsCurrency()).toBe('-5.20');
    });
    it('converts Infinity to "0.00"', function () {
       expect(Infinity.formatAsCurrency()).toBe('0.00');
    });
    it('converts NaN to "0.00"', function () {
       expect(NaN.formatAsCurrency()).toBe('0.00');
    });
  });

  // String.formatAsCurrency extension
  describe('String.formatAsCurrency', function () {
    it('converts "14.9" to "14.90"', function () {
      expect('14.9'.formatAsCurrency()).toBe('14.90');
    });
    it('converts "-5.2" to "-5.20"', function () {
      expect('-5.2'.formatAsCurrency()).toBe('-5.20');
    });
  });

  // String.capitalize extension
  describe('String.capitalize', function () {
    it('converts "chase checking" to "Chase checking"', function () {
      expect('chase checking'.capitalize()).toEqual('Chase checking');
    });
  });

  // String.toFloat extension
  describe('String.toFloat', function () {
    it('converts "-$123.45" to -123.45', function () {
      expect('-$123.45'.toFloat()).toEqual(-123.45);
    });
  });

  // Global isNumber function
  describe('isNumber', function () {
    it('says that integers are numbers', function () {
      for (var i = -10; i <= 10; i += 1) {
        expect(isNumber(i)).toBe(true);
      }
    });
    it('says that floats are numbers', function () {
      var arr = [0.01, 1.23, -100.05, 123.4567], i;
      for (i = 0; i < arr.length; i += 1) {
        expect(isNumber(arr[i])).toBe(true);
      }
    });
    it('says Infinity is not a number', function () {
       expect(isNumber(Infinity)).toBe(false);
    });
    it('says "Hello" is not a number', function () {
       expect(isNumber('Hello')).toBe(false);
    });
    it('says "2012/06/05" is not a number', function () {
       expect(isNumber('2012/06/05')).toBe(false);
    });
  });

  // Global isArray function
  describe('isArray', function () {
    it('say that null is not an array', function () {
      expect(isArray(null)).toBeFalsy();
    });
    it('say that undefined is not an array', function () {
      expect(isArray(undefined)).toBeFalsy();
    });
    it('say that "123" is not an array', function () {
      expect(isArray("123")).toBeFalsy();
    });
    it('say that [] is an array', function () {
      expect(isArray([])).toBeTruthy();
    });
    it('say that Array() is an array', function () {
      expect(isArray(Array())).toBeTruthy();
    });
  });
});

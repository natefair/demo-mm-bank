#!/usr/local/bin/perl -w
use strict;
use warnings;
no warnings qw(redefine);

use Apache2::Const -compile => qw(OK HTTP_INTERNAL_SERVER_ERROR);
use Apache2::Request ();
use Apache2::RequestRec ();
use Apache2::RequestUtil ();
use Apache2::Response ();

# ===========================================================================
# Global variables
# ===========================================================================

use constant GRXML => << 'End';
<?xml version= "1.0"?>
<grammar xmlns="http://www.w3.org/2001/06/grammar" version="1.0"
  xml:lang="en-US" root="rootrule" tag-format="semantics/1.0">

  <tag>
    var now = new Date();
    var currDay = now.getDay();
    var currMonth = now.getMonth();
    var currDate = now.getDate();
    var currYear = now.getYear();

    function changeDay(day) {
      now.setDate(day);
      if (currDate &lt; day) {
        var prevMonth = currMonth - 1;
        if (prevMonth == -1) {
          prevMonth = 12;
          now.setYear(currYear - 1);
        }
        now.setMonth(prevMonth);
      }
    }

    function changeMonthAndDay(month, day) {
      now.setDate(day);
      now.setMonth(month);
      if (currMonth &lt; month || (currMonth == month &amp;&amp; currDate &lt; day)) {
        now.setYear(currYear - 1);
      }
    }

    function changeDayOfWeek(dayofweek, lastWeek) {
      now.setDate(currDate - currDay + dayofweek -
        ((currDay &lt; dayofweek || lastWeek)?7:0));
    }
  </tag>

  <rule id="showMeMyRecent" scope="private">
    <item repeat="0-1">show</item>
    <item repeat="0-1">me</item>
    <item repeat="0-1">my</item>
    <item repeat="0-1">recent</item>
  </rule>

  <rule id="rootrule" scope="public">
    <one-of>
      <item>
        <ruleref uri="#showMeMyRecent"/>
        <item repeat="0-1">recent</item>
        <ruleref uri="#charges"/>
        <one-of>
          <item><ruleref uri="#sinceDate"/><tag>out.action = "filter"; out.field = "date"; out.comparison = "since"; out.value = rules.sinceDate.getTime();</tag></item>
          <item><ruleref uri="#moreThanAmount"/><tag>out.action = "filter"; out.field = "amount"; out.comparison = "greater than"; out.value = rules.moreThanAmount;</tag></item>
          <item><ruleref uri="#lessThanAmount"/><tag>out.action = "filter"; out.field = "amount"; out.comparison = "less than"; out.value = rules.lessThanAmount;</tag></item>
          %s
        </one-of>
      </item>
      %s
      <item>
        <ruleref uri="#makePayment"/>
        <tag>out.action = "make payment"</tag>
      </item>
      <item>
        <ruleref uri="#chat"/>
        <tag>out.action = "chat"</tag>
      </item>
    </one-of>
  </rule>

  %s

  <rule id="sinceDate">
    <item>since <ruleref uri="#dateFlavor"/><tag>out = rules.dateFlavor;</tag></item>
  </rule>

  <rule id="moreThanAmount">
    <item>
      <one-of>
        <item>
          <one-of>
            <item>more</item>
            <item>greater</item>
          </one-of>
          than
        </item>
        <item>over</item>
      </one-of>
      <ruleref uri="#number"/>
      <tag>out = rules.number;</tag>
      <item repeat="0-1">dollars</item>
    </item>
  </rule>

  <rule id="lessThanAmount">
    <item>
      <one-of>
        <item>less than</item>
        <item>under</item>
      </one-of>
      <ruleref uri="#number"/>
      <tag>out = rules.number;</tag>
    </item>
    <item repeat="0-1">dollars</item>
  </rule>

  <rule id="charge">
    <one-of>
      <item>charge</item>
      <item>transaction</item>
    </one-of>
  </rule>

  <rule id="charges">
    <one-of>
      <item>charges</item>
      <item>transactions</item>
    </one-of>
  </rule>

  <rule id="chat">
    <one-of>
      <item>help</item>
      <item>agent</item>
    </one-of>
  </rule>

  <rule id="makePayment" scope="private">
    <item>
      <ruleref uri="#wanna"/>
      <one-of>
        <item>make <item repeat="0-1">a</item> payment</item>
        <item>pay <item repeat="0-1">my</item>
          <one-of>
            <item>bill</item>
            <item><item repeat="0-1">credit</item> card</item>
          </one-of>
        </item>
      </one-of>
      <item repeat="0-1">
        please
      </item>
    </item>
  </rule>

  <rule id="wanna" scope="private">
    <item repeat="0-1">
       <one-of>
        <item>i'd like to</item>
        <item>i
          <one-of>
            <item>would like to</item>
            <item>want to</item>
            <item>wanna</item>
          </one-of>
        </item>
      </one-of>
    </item>
  </rule>

  <rule id="dateFlavor">
    <one-of>
      <item><ruleref uri="#dayofweek"/><tag>changeDayOfWeek(rules.dayofweek, false); out = now;</tag></item>
      <item>last <ruleref uri="#dayofweek"/><tag>changeDayOfWeek(rules.dayofweek, true);  out = now;</tag></item>
      <item><ruleref uri="#dayFlavor"/><tag>changeDay(rules.dayFlavor);  out = now;</tag></item>
      <item><ruleref uri="#dayAndMonthFlavor"/><tag>changeMonthAndDay(rules.dayAndMonthFlavor.month, rules.dayAndMonthFlavor.day);  out = now;</tag></item>
    </one-of>
  </rule>

  <rule id="dayFlavor">
    <one-of>
      <item>the <ruleref uri="#day"/><tag>out = rules.day;</tag></item>
      <item><ruleref uri="#dayofweek"/> the <ruleref uri="#day"/><tag>out = rules.day;</tag></item>
    </one-of>
  </rule>

  <rule id="dayAndMonthFlavor">
    <one-of>
      <item>the <ruleref uri="#day"/> of <ruleref uri="#month"/><tag>out.month = rules.month; out.day = rules.day;</tag></item>
      <item><ruleref uri="#month"/> <ruleref uri="#day"/><tag>out.month = rules.month; out.day = rules.day;</tag></item>
      <item><ruleref uri="#dayofweek"/> <ruleref uri="#month"/> <ruleref uri="#day"/><tag>out.month = rules.month; out.day = rules.day;</tag></item>
      <item><ruleref uri="#dayofweek"/> the <ruleref uri="#day"/> of <ruleref uri="#month"/><tag>out.month = rules.month; out.day = rules.day;</tag></item>
    </one-of>
  </rule>

  <rule id="day">
    <one-of>
      <item>first<tag>out = 1;</tag></item>
      <item>second<tag>out = 2;</tag></item>
      <item>third<tag>out = 3;</tag></item>
      <item>fourth<tag>out = 4;</tag></item>
      <item>fifth<tag>out = 5;</tag></item>
      <item>sixth<tag>out = 6;</tag></item>
      <item>seventh<tag>out = 7;</tag></item>
      <item>eighth<tag>out = 8;</tag></item>
      <item>ninth<tag>out = 9;</tag></item>
      <item>tenth<tag>out = 10;</tag></item>
      <item>eleventh<tag>out = 11;</tag></item>
      <item>twelfth<tag>out = 12;</tag></item>
      <item>thirteenth<tag>out = 13;</tag></item>
      <item>fourteenth<tag>out = 14;</tag></item>
      <item>fifteenth<tag>out = 15;</tag></item>
      <item>sixteenth<tag>out = 16;</tag></item>
      <item>seventeenth<tag>out = 17;</tag></item>
      <item>eighteenth<tag>out = 18;</tag></item>
      <item>nineteenth<tag>out = 19;</tag></item>
      <item>twentieth<tag>out = 20;</tag></item>
      <item>twenty-first<tag>out = 21;</tag></item>
      <item>twenty-second<tag>out = 22;</tag></item>
      <item>twenty-third<tag>out = 23;</tag></item>
      <item>twenty-fourth<tag>out = 24;</tag></item>
      <item>twenty-fifth<tag>out = 25;</tag></item>
      <item>twenty-sixth<tag>out = 26;</tag></item>
      <item>twenty-seventh<tag>out = 27;</tag></item>
      <item>twenty-eighth<tag>out = 28;</tag></item>
      <item>twenty-ninth<tag>out = 29;</tag></item>
      <item>thirtieth<tag>out = 30;</tag></item>
      <item>thirty-first<tag>out = 31;</tag></item>
    </one-of>
  </rule>

  <rule id="month">
    <one-of>
      <item>January<tag>out = 0;</tag></item>
      <item>February<tag>out = 1;</tag></item>
      <item>March<tag>out = 2;</tag></item>
      <item>April<tag>out = 3;</tag></item>
      <item>May<tag>out = 4;</tag></item>
      <item>June<tag>out = 5;</tag></item>
      <item>July<tag>out = 6;</tag></item>
      <item>August<tag>out = 7;</tag></item>
      <item>September<tag>out = 8;</tag></item>
      <item>October<tag>out = 9;</tag></item>
      <item>November<tag>out = 10;</tag></item>
      <item>December<tag>out = 11;</tag></item>
    </one-of>
  </rule>

  <rule id="dayofweek">
    <one-of>
      <item>Sunday<tag>out = 0;</tag></item>
      <item>Monday<tag>out = 1;</tag></item>
      <item>Tuesday<tag>out = 2;</tag></item>
      <item>Wednesday<tag>out = 3;</tag></item>
      <item>Thursday<tag>out = 4;</tag></item>
      <item>Friday<tag>out = 5;</tag></item>
      <item>Saturday<tag>out = 6;</tag></item>
    </one-of>
  </rule>

  <!-- supports 0 - 999 -->
  <rule id="number">
    <tag>out = 0;</tag>
    <one-of>
      <item><ruleref uri="#digit"/><tag>out = rules.latest();</tag></item>  
      <item><ruleref uri="#val10_19"/><tag>out = rules.latest();</tag></item>
      <item>
        <ruleref uri="#val10s"/><tag>out = rules.latest();</tag>
        <item repeat="0-1"><ruleref uri="#digit"/><tag> out += rules.latest();</tag></item>
      </item>
      <item>
        <ruleref uri="#val100s"/><tag>out = rules.latest();</tag>
        <item repeat="0-1">and</item>
        <item repeat="0-1"><ruleref uri="#val10s"/><tag>out += rules.latest();</tag></item>
        <item repeat="0-1"><ruleref uri="#digit"/><tag> out += rules.latest();</tag></item>
      </item>
    </one-of>
  </rule>

  <rule id="digit">
    <one-of>
      <item>0<tag>out=0;</tag></item>
      <item>1<tag>out=1;</tag></item>
      <item>2<tag>out=2;</tag></item>
      <item>3<tag>out=3;</tag></item>
      <item>4<tag>out=4;</tag></item>
      <item>5<tag>out=5;</tag></item>
      <item>6<tag>out=6;</tag></item>
      <item>7<tag>out=7;</tag></item>
      <item>8<tag>out=8;</tag></item>
      <item>9<tag>out=9;</tag></item>
    </one-of>
  </rule>

  <rule id="val10_19">
    <one-of>
      <item>ten<tag>out=10;</tag></item>
      <item>eleven<tag>out=11;</tag></item>
      <item>twelve<tag>out=12;</tag></item>
      <item>thirteen<tag>out=13;</tag></item>
      <item>fourteen<tag>out=14;</tag></item>
      <item>fifteen<tag>out=15;</tag></item>
      <item>sixteen<tag>out=16;</tag></item>
      <item>seventeen<tag>out=17;</tag></item>
      <item>eighteen<tag>out=18;</tag></item>
      <item>nineteen<tag>out=19;</tag></item>
    </one-of>
  </rule>

  <rule id="val10s">
    <one-of>
      <item>twenty<tag>out=20;</tag></item>
      <item>thirty<tag>out=30;</tag></item>
      <item>forty<tag>out=40;</tag></item>
      <item>fifty<tag>out=50;</tag></item>
      <item>sixty<tag>out=60;</tag></item>
      <item>seventy<tag>out=70;</tag></item>
      <item>eighty<tag>out=80;</tag></item>
      <item>ninety<tag>out=90;</tag></item>
    </one-of>
  </rule>

  <rule id="val100s">
    <one-of>
      <item>a hundred<tag>out=100;</tag></item>
      <item>one hundred<tag>out=100;</tag></item>
      <item>two hundred<tag>out=200;</tag></item>
      <item>three hundred<tag>out=300;</tag></item>
      <item>four hundred<tag>out=400;</tag></item>
      <item>five hundred<tag>out=500;</tag></item>
      <item>six hundred<tag>out=600;</tag></item>
      <item>seven hundred<tag>out=700;</tag></item>
      <item>eight hundred<tag>out=800;</tag></item>
      <item>nine hundred<tag>out=900;</tag></item>
    </one-of>
  </rule>
</grammar>
End

use constant MAINMENU_ROOT_RULES => << 'End';
      <!-- [show] [me] [my] [recent] charges -->
      <!-- [show] [me] [my] [recent] transactions -->
      <item>
        <ruleref uri="#showMeMyRecent"/>
        <ruleref uri="#charges"/>
        <tag>out.action = "recent transactions"</tag>
      </item>

      <!-- make [a] payment -->
      <item>
        make
        <item repeat="0-1">a</item>
        payment
        <tag>out.action = "make payment"</tag>
      </item>

      <!-- find an A T M -->
      <item>
        find an a t m
        <tag>out.action = "atm"</tag>
      </item>

      <!-- Rewards points -->
      <item>
        rewards points
        <tag>out.action = "rewards"</tag>
      </item>

      <!-- Contact us -->
      <item>
        contact us
        <tag>out.action = "contact"</tag>
      </item>

      <!-- Report a lost card -->
      <!-- Report a stolen card -->
      <item>
        <ruleref uri="#report"/>
        <tag>out.action = "report missing"</tag>
      </item>
End

use constant RECENTTRANSACTIONS_ROOT_RULES => << 'End';
      <item>
        sort by date starting with the newest
        <tag>out.action = "sort"; out.field = "date"; out.order = "desc";</tag>
      </item>
      <item>
        <ruleref uri="#sortByDateAsc"/>
        <tag>out.action = "sort"; out.field = "date"; out.order = "asc";</tag>
      </item>
      <item>
        sort by amount starting with the highest
        <tag>out.action = "sort"; out.field = "amount"; out.order = "desc";</tag>
      </item>
      <item>
        <ruleref uri="#sortByAmountAsc"/>
        <tag>out.action = "sort"; out.field = "amount"; out.order = "asc";</tag>
      </item>
      <item>
        <ruleref uri="#sortByNameDesc"/>
        <tag>out.action = "sort"; out.field = "merchant"; out.order = "desc";</tag>
      </item>
      <item>
        <ruleref uri="#sortByNameAsc"/>
        <tag>out.action = "sort"; out.field = "merchant"; out.order = "asc";</tag>
      </item>
      <item>
        <ruleref uri="#detailByIdx"/>
        <tag>out.action = "detail"; out.idx = rules.detailByIdx;</tag>
     </item>
     <item>
        <ruleref uri="#mainMenu"/>
        <tag>out.action = "main menu";</tag>
     </item>
End

use constant MAINMENU_EXTRA_RULES => << 'End';
  <rule id="report" scope="private">
    report a
    <one-of>
      <item>lost</item>
      <item>stolen</item>
    </one-of>
    card
  </rule>
End

use constant RECENTTRANSACTIONS_EXTRA_RULES => << 'End';
  <rule id="sortByDateAsc">
    <item>sort by date</item>
    <item repeat="0-1">starting with the oldest</item>
  </rule>

  <rule id="sortByAmountAsc">
    <item>sort by amount</item>
    <item repeat="0-1">starting with the lowest</item>
  </rule>

  <rule id="sortByNameAsc">
    <item>
      sort by
      <item repeat="0-1">merchant</item>
      name
      <item repeat="0-1">in alphabetical order</item>
    </item>
  </rule>

  <rule id="sortByNameDesc">
    <item>
      sort by
      <item repeat="0-1">merchant</item>
      name in reverse alphabetical order
    </item>
  </rule>

  <rule id="detailByIdx">
    <one-of>
      <item>
        show
        <item repeat="0-1">details of</item>
        the <ruleref uri="#ordering"/><tag>out = rules.ordering - 1;</tag>
        <item repeat="0-1">
          <one-of>
            <item>one</item>
            <item><ruleref uri="#charge"/></item>
          </one-of>
        </item>
      </item>
      <item>
        show
        <item repeat="0-1">details of</item>
        <ruleref uri="#charge"/>
        <ruleref uri="#number"/><tag>out = rules.number - 1;</tag>
      </item>
    </one-of>
  </rule>

  <!-- supports 1st - 99th -->
  <rule id="ordering">
    <tag>out = 0;</tag>
    <one-of>
      <item><ruleref uri="#ordering_digit"/><tag>out = rules.latest();</tag></item>  
      <item><ruleref uri="#ordering10_19_and_10s"/><tag>out = rules.latest();</tag></item>
      <item>
        <ruleref uri="#val10s"/><tag>out = rules.latest();</tag>
        <ruleref uri="#ordering_digit"/><tag> out += rules.latest();</tag>
      </item>
    </one-of>
  </rule>

  <rule id="ordering_digit">
    <one-of>
      <item>first<tag>out = 1;</tag></item>
      <item>second<tag>out = 2;</tag></item>
      <item>third<tag>out = 3;</tag></item>
      <item>fourth<tag>out = 4;</tag></item>
      <item>fifth<tag>out = 5;</tag></item>
      <item>sixth<tag>out = 6;</tag></item>
      <item>seventh<tag>out = 7;</tag></item>
      <item>eighth<tag>out = 8;</tag></item>
      <item>ninth<tag>out = 9;</tag></item>
    </one-of>
  </rule>

  <rule id="ordering10_19_and_10s">
    <one-of>
      <item>tenth<tag>out = 10;</tag></item>
      <item>eleventh<tag>out = 11;</tag></item>
      <item>twelfth<tag>out = 12;</tag></item>
      <item>thirteenth<tag>out = 13;</tag></item>
      <item>fourteenth<tag>out = 14;</tag></item>
      <item>fifteenth<tag>out = 15;</tag></item>
      <item>sixteenth<tag>out = 16;</tag></item>
      <item>seventeenth<tag>out = 17;</tag></item>
      <item>eighteenth<tag>out = 18;</tag></item>
      <item>nineteenth<tag>out = 19;</tag></item>
      <item>twentieth<tag>out = 20;</tag></item>
      <item>thirtieth<tag>out = 30;</tag></item>
      <item>fourtieth<tag>out = 40;</tag></item>
      <item>fiftieth<tag>out = 50;</tag></item>
      <item>sixtieth<tag>out = 60;</tag></item>
      <item>seventieth<tag>out = 70;</tag></item>
      <item>eightieth<tag>out = 80;</tag></item>
      <item>ninetieth<tag>out = 90;</tag></item>
    </one-of>
  </rule>

  <rule id="mainMenu" scope="private">
    <one-of>
      <item>go back</item>
      <item>go home</item>
      <item><item repeat="0-1">main</item> menu</item>
    </one-of>
  </rule>
End

use constant MERCHANT_ROOT_RULE_ITEM => << 'End';
          <item>from <ruleref uri="#merchant"/><tag>out.action = "filter"; out.field = "merchant"; out.comparison = "="; out.value = rules.merchant;</tag></item>
End

use constant MERCHANT_RULE => << 'End';
  <rule id="merchant">
    <one-of>
      %s
    </one-of>
  </rule>
End

use constant ITEM => << 'End';
    <item>%s<tag>out="%s";</tag></item>
End

our  %xml_entity_map = qw(& amp < lt > gt " quot ' apos);

our $R            = shift;
our $APR          = Apache2::Request->new($R);

$R->no_cache(1);                  # Send Pragma and Cache-Control headers

# ===========================================================================
# Main body
# ===========================================================================
{
    my ($type, $merchants, $root_rules, $extra_rules, $merchant_items);
    $root_rules = '';
    $extra_rules = '';
    $merchant_items = '';

# ===========================================================================
# 1. Parse parameters
# ===========================================================================
    $type = $APR->param('type');
    $merchants = $APR->param('merchants');

# ===========================================================================
# 2. Get tokens and tags
# ===========================================================================
    if ($type eq 'mainmenu') {
        $root_rules = MAINMENU_ROOT_RULES;
        $extra_rules = MAINMENU_EXTRA_RULES;
    } elsif ($type eq 'recenttransactions') {
        $root_rules = RECENTTRANSACTIONS_ROOT_RULES;
        $extra_rules = RECENTTRANSACTIONS_EXTRA_RULES;
    }

    $merchant_items = '';
    my @merchant_list = split(/<DELIM>/, $merchants);
    foreach my $merchant (@merchant_list) {
        my $merchant_item = $merchant;
        $merchant_item =~ s/&/and/g;
        $merchant_items .= sprintf(ITEM, xml_escape($merchant_item), xml_escape($merchant));
    }

    if ($merchant_items ne '') {
        $extra_rules .= sprintf(MERCHANT_RULE, $merchant_items);
    }

# ===========================================================================
# 3. return grammar
# ===========================================================================
    $R->content_type('text/xml');
    $R->print(sprintf GRXML, $merchant_items ne '' ? MERCHANT_ROOT_RULE_ITEM : '', $root_rules, $extra_rules);
    return Apache2::Const::OK;
}

sub xml_escape($) {
    local $_ = shift;
    defined $_ or return;
    s/[&<>"']/\&$xml_entity_map{$&};/g;
    return $_;
}


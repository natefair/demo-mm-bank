demo-mm-bank
============

[24]7 Bank Demo
===============

A demo app evolved to encompass 2 or more individual journeys.

The code has been unified from the Recent Transactions and Payments demos with the goals of making it easier to expand the demo, making page controllers more consistent, and having a consistent coding style.

Adding a newly demo
-------------------

First: add 1 make targets to the Makefile in the root of the repository:

    <clientname>:
            bin/generate?client_files.pl -make <clientname> \
            CLIENT_CAMEL_CASE=<ClientName> \
            BACKGROUND_COLOR='#...' \
            BACKGROUND_REPEAT=... \
            FONT_COLOR='#...' \
            HEADING_FONT_COLOR='#...' \
            HEADING_FONT_WEIGHT=... \
            LAST_NUM_CARD_DIGITS=... \
            LAST_CARD_DIGITS_PREFIX='...'

Then, add <clientname> as a target for the "all:" target in order for it to be built when calling:

    make rebuild

Second: create an image directory:

    mkdir img/<clientname>

Third: add custom images to the img/<clientname> directory:

    Payments-CalendarWidget-<ClientName>.png
    Payments-Chat-AgentTextBubbleFilled-<ClientName>.png
    Payments-MakePayment-Calendar-<ClientName>.png
    Payments-MakePayment-FormBackground-<ClientName>.png
    Payments-MakePayment-Submit-<ClientName>.png
    Payments-NewAccount-AddAccount-<ClientName>.png
    Payments-NewAccount-CheckImage-<ClientName>.png
    Payments-Scheduled-Continue-<ClientName>.png
    Payments-Survey-SubmitSurvey-<ClientName>.png
    back.png
    bg.png
    card.png
    done.png
    home.png
    logo-chat.png
    logo.png
    menu1.png
    menu2.png
    menu3.png
    menu4.png
    menu5.png
    menu6.png
    paynow.png
    recent.png

Development Workflow
--------------------

Goes something like this:

Edit files:

    vim <file>

Rebuild the build/ directory:

    make rebuild

Test in browser.

When happy, deploy to dev environment: 

    make dev_deploy

When complete, deploy to prod environment:

    make prod_deploy


Code Conventions
================
* Object-oriented coding.
* Classe names are PascalCased
* Public methods are camelCased
* Private methods are lower_case_with_underscores
* 'init' method is used to initialize each page
* Prefer jQuery utility methods over for/for-in loops
* Avoid inline Javascript in HTML
* Prefer post-loaded Javascript
* === (strict) is preferred over == (coersive)
* !== (strict) is preferred over != (coersive)
* Single quotes (') are preferred over double quotes (")
* All methods should have a return value ('return this;' is a good default)

Preferences
-----------
* All Javascript passes JSLint evaluation, with the following exceptions:
 1. 'use strict'; pragma not required

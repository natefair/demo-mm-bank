# Deployment details
USER = ec2-user
HOST = ec2-184-72-7-75.us-west-1.compute.amazonaws.com
DEV_NAME = bank-demo-dev
DEV_PATH = /var/www/html/content/$(DEV_NAME)/
DEV_PERL_PATH = /var/www/perl/$(DEV_NAME)/grammars
PROD_NAME = bank-demo-prod
PROD_PATH = /var/www/html/content/$(PROD_NAME)/
PROD_PERL_PATH = /var/www/perl/$(PROD_NAME)/grammars
SSH_KEY = $(HOME)/.ssh/fkg-p.pem

build: templates/index-template.html js/bank_demo.js js/acctdata.js js/transactions.js js/extensions.js
	mkdir -p build/css build/js build/img; \
	rsync -ravq common/js/bridge.js build/js; \
	rsync -ravq js build/; \
	rsync -ravq css build/; \
	rsync -ravq img build/; \
	rsync -ravq audio build/; \
	rsync -ravq grammars build/; \
	rsync -ravq data build/;

clean:
	rm -rf build/

amex: build
	bin/generate_client_files.pl -make amex \
	CLIENT_CAMEL_CASE=Amex \
	BACKGROUND_COLOR= \
	BACKGROUND_REPEAT= \
	FONT_COLOR='#26759b' \
	HEADING_FONT_COLOR='#26759b' \
	HEADING_FONT_WEIGHT=normal \
	LAST_NUM_CARD_DIGITS=5 \
	LAST_CARD_DIGITS_PREFIX='-'

capone: build
	bin/generate_client_files.pl -make capone \
	CLIENT_CAMEL_CASE=CapOne \
	BACKGROUND_COLOR='#013b70' \
	BACKGROUND_REPEAT=no-repeat \
	FONT_COLOR='#0b335c' \
	HEADING_FONT_COLOR='#ffffff' \
	HEADING_FONT_WEIGHT=bold \
	LAST_NUM_CARD_DIGITS=4 \
	LAST_CARD_DIGITS_PREFIX='...'

premiumbank: build
	bin/generate_client_files.pl -make premiumbank \
	CLIENT_CAMEL_CASE=PremiumBank \
	BACKGROUND_COLOR='#17629B' \
	BACKGROUND_REPEAT=no-repeat \
	FONT_COLOR='#0b335c' \
	HEADING_FONT_COLOR='#ffffff' \
	HEADING_FONT_WEIGHT=bold \
	LAST_NUM_CARD_DIGITS=4 \
	LAST_CARD_DIGITS_PREFIX='...'

all: amex capone premiumbank

rebuild: clean all

dev_deploy: all
	ssh -i $(SSH_KEY) $(USER)@$(HOST) 'mkdir -p $(DEV_PATH) $(DEV_PERL_PATH)'; \
	rsync -ravz -e "ssh -i $(SSH_KEY) -l $(USER)" build/ $(USER)@$(HOST):$(DEV_PATH); \
	rsync -ravz -e "ssh -i $(SSH_KEY) -l $(USER)" bin/dynamicgram.pl $(USER)@$(HOST):$(DEV_PERL_PATH)
	#bin/generate_grammar_files.pl $(DEV_NAME) \

prod_deploy: all
	ssh -i $(SSH_KEY) $(USER)@$(HOST) 'mkdir -p $(PROD_PATH) $(PROD_PERL_PATH)'; \
	rsync -ravz -e "ssh -i $(SSH_KEY) -l $(USER)" build/ $(USER)@$(HOST):$(PROD_PATH); \
	rsync -ravz -e "ssh -i $(SSH_KEY) -l $(USER)" bin/dynamicgram.pl $(USER)@$(HOST):$(PROD_PERL_PATH)
	#bin/generate_grammar_files.pl $(PROD_NAME) \

# Deployment details
USER=ec2-user
HOST=ec2-184-72-7-75.us-west-1.compute.amazonaws.com
DEV_PATH=/var/www/html/content/bank-demo-dev/
PROD_PATH=/var/www/html/content/bank-demo-prod/
SSH_KEY="$(HOME)/.ssh/fkg-p.pem"

build: templates/index-template.html js/bank_demo.js js/acctdata.js js/transactions.js js/extensions.js
	mkdir -p build/css build/js build/img; \
	rsync -ravq common/js/bridge.js build/js; \
	rsync -ravq js build/; \
	rsync -ravq css build/; \
	rsync -ravq img build/; \
	rsync -ravq data build/;

clean_build:
	rm -rf build/

# TODO: deploy dynamicgram.pl to /var/www/perl/content/bank-demo-dev/grammars

all: amex capone

clean: clean_build

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

clean_amex:
	bin/generate_client_files.pl -clean amex

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

clean_capone:
	bin/generate_client_files.pl -clean capone

rebuild: clean all

dev_deploy: all
	rsync -ravz -e "ssh -i $(SSH_KEY) -l $(USER)" build/ $(USER)@$(HOST):$(DEV_PATH)

prod_deploy: all
	rsync -ravz -e "ssh -i $(SSH_KEY) -l $(USER)" build/ $(USER)@$(HOST):$(PROD_PATH)

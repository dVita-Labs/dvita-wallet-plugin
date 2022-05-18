##
## Copyright (c) 2021 - Team11. All rights reserved.
##

all: build

build: node_modules
	npm run build

node_modules: package.json
	npm install --quiet

run-dev:
	npm run start

clean:
	-@rm -rf ./dist

distclean: clean
	-@rm -rf ./node_modules

.PHONY: all build run-dev clean 

.SILENT: clean


install:
	npm install origami-build-tools
	obt install

test:
	mocha --reporter spec -i tests
	nbt verify --skip-layout-checks --skip-dotenv-check


integration-test:
	export DEBUG=graphite; node examples/app.js


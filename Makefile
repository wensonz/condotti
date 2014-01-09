
SRC = src

CONDOTTI = \
	"$(SRC)/core/condotti.js" \
	"$(SRC)/core/lang.js" \
	"$(SRC)/core/async.js" \
	"$(SRC)/core/errors.js" \
	"$(SRC)/core/logging.js" \
	"$(SRC)/core/uuid.js"

WEB = \
	"$(SRC)/web/core.js" \
	"$(SRC)/web/loader.js"

SERVER = \
	"$(SRC)/server/core.js" \
	"$(SRC)/server/loader.js" \
	"$(SRC)/server/logging.js"

BUILD = build
TARGET = $(BUILD)/condotti.js

build:
	@mkdir $(BUILD)
	@touch $(TARGET)

web: build
	@cat $(CONDOTTI) >> $(TARGET)
	@cat $(WEB) >> $(TARGET)
	@echo "Condotti['CORE-MODULES'] = Object.keys(Condotti.modules);" >> $(TARGET)

server: build
	@cat $(CONDOTTI) >> $(TARGET)
	@cat $(SERVER) >> $(TARGET)
	@echo "Condotti['CORE-MODULES'] = Object.keys(Condotti.modules);" >> $(TARGET)
	
clean:
	@rm -rf $(BUILD)

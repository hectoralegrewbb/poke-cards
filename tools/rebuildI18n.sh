#!/usr/bin/env bash
# Regenera el inglés. Ejecutar desde la raíz del juego: bash tools/rebuildI18n.sh
set -e
python3 tools/buildStory.py                              # data/story.json + i18n/en.story.json
node tools/collectKeys.mjs . tools/.uikeys.json          # claves t("...") del código
python3 tools/buildUi.py tools/i18n/ui1.txt tools/i18n/ui2.txt   # i18n/en.ui.json (avisa MISSING)
python3 tools/buildI18n.py                               # src/shared/en.js

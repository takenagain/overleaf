#!/usr/bin/env bash
set -euo pipefail

COMMIT="e8342700b4dde06130cdbba75f7e6500ffa58864" # Hunspell 1.7.5

curl --fail --location "https://github.com/hunspell/hunspell/archive/${COMMIT}.tar.gz" | tar xvz

cd "hunspell-${COMMIT}"
autoreconf -fiv
emconfigure ./configure --disable-shared --enable-static
emmake make

em++ \
    -s EXPORTED_FUNCTIONS="['_Hunspell_create', '_Hunspell_destroy', '_Hunspell_spell', '_Hunspell_suggest', '_Hunspell_free_list', '_Hunspell_add_dic', '_Hunspell_add', '_Hunspell_remove', '_free', '_malloc', 'FS']" \
    -s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap', 'getValue', 'stringToNewUTF8', 'UTF8ToString', 'MEMFS']" \
    -s ENVIRONMENT=worker \
    -s STACK_SIZE=5MB \
    -s ALLOW_MEMORY_GROWTH \
    -O2 \
    -g2 \
    src/hunspell/.libs/libhunspell-1.7.a \
    -o hunspell.mjs

cp hunspell.{mjs,wasm} /wasm/

#!/usr/bin/env bash
set -euo pipefail

COMMIT="15faca15532b34db3106d50f162e5edc2503d6d6" # Hunspell 1.7.6

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

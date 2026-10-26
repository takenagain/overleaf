#!/usr/bin/env bash
set -euo pipefail

podman_runtime=$(command -v podman || true)
docker_runtime=$(command -v docker || true)
if [ -n "$podman_runtime" ]; then
  container_runtime=$podman_runtime
elif [ -n "$docker_runtime" ]; then
  container_runtime=$docker_runtime
else
  echo "Install Podman or Docker to build Hunspell." >&2
  exit 1
fi

# build an Emscripten SDK Docker image with Hunspell's build dependencies installed
"$container_runtime" build --pull --tag overleaf/emsdk .

# compile Hunspell to WASM and copy the output files from the Docker container
"$container_runtime" run --rm \
  --workdir /opt \
  --volume "$(pwd)/wasm":/wasm \
  --volume "$(pwd)/compile.sh":/opt/compile.sh:ro \
  overleaf/emsdk \
  bash compile.sh

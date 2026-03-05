# Agent Instructions

- Check for both Podman and Docker before running container commands.
- If both are installed, prefer Podman tools.
- Use `podman-compose` instead of `docker compose` when Podman is present.
- Do not run `docker compose ...` on systems that have Podman installed.

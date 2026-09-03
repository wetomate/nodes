#!/bin/sh

set -eu

repository_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
compose_file="$repository_root/docker-compose.dev.yml"

compose() {
	if docker compose version >/dev/null 2>&1; then
		docker compose -f "$compose_file" "$@"
	elif command -v docker-compose >/dev/null 2>&1; then
		docker-compose -f "$compose_file" "$@"
	else
		echo "Docker Compose is required." >&2
		exit 1
	fi
}

remove_stale_container() {
	# docker-compose 1.29.2 expects the removed ContainerConfig image field
	# while recreating containers against newer Docker Engine versions.
	compose rm -sf n8n >/dev/null 2>&1 || true
}

cd "$repository_root"

stop_browser() {
	node "$repository_root/scripts/dev-browser-stop.mjs"
}

cleanup() {
	stop_browser
}

case "${1:-up}" in
	check)
		remove_stale_container
		compose build n8n
		compose run --rm --no-deps n8n check
		;;
	down)
		stop_browser
		compose down
		;;
	restart)
		compose restart n8n
		;;
	seed)
		if compose exec -T n8n true >/dev/null 2>&1; then
			echo "Stop the n8n development container with 'npm run dev:down' before forcing a workflow import." >&2
			exit 1
		fi
		remove_stale_container
		compose build n8n
		compose run --rm --no-deps n8n seed
		;;
	shell)
		remove_stale_container
		compose run --rm --no-deps n8n shell
		;;
	up)
		trap cleanup EXIT
		trap 'exit 130' INT TERM HUP
		remove_stale_container
		compose up --build -d n8n
		if [ -f "$repository_root/.env" ]; then
			set -a
			. "$repository_root/.env"
			set +a
		fi
		if [ "${WETOMATE_AUTO_LOGIN:-true}" = "true" ]; then
			WETOMATE_N8N_EMAIL="${WETOMATE_N8N_EMAIL:-dev@wetomate.local}" \
			WETOMATE_N8N_PASSWORD="${WETOMATE_N8N_PASSWORD:-Wetomate123!}" \
				node "$repository_root/scripts/dev-browser-login.mjs" &
		fi
		# docker-compose 1.29.2 can crash in its Python event watcher when a
		# container event does not include an id. Follow the resolved container
		# directly so container failures remain visible without that race.
		container_id=$(compose ps -q n8n)
		if [ -z "$container_id" ]; then
			echo "The n8n development container was not created." >&2
			exit 1
		fi
		docker logs -f "$container_id"
		;;
	*)
		echo "Usage: $0 [up|check|restart|seed|shell|down]" >&2
		exit 2
		;;
esac

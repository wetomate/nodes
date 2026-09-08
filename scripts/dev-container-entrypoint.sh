#!/bin/sh

set -eu

repository_root=${WETOMATE_REPOSITORY_ROOT:-/workspace}
n8n_data_directory=${WETOMATE_N8N_DATA_DIRECTORY:-/home/node/.n8n}
custom_modules="$n8n_data_directory/custom/node_modules"
dependency_marker="$repository_root/node_modules/.wetomate-package-lock.sha256"
sample_workflow_marker="$n8n_data_directory/.wetomate-sample-workflows.sha256"

cd "$repository_root"

install_dependencies() {
	lock_hash=$(
		node -e "const fs = require('fs'); const crypto = require('crypto'); process.stdout.write(crypto.createHash('sha256').update(fs.readFileSync('package-lock.json')).digest('hex'));"
	)

	if [ ! -f "$dependency_marker" ] || [ "$(sed -n '1p' "$dependency_marker")" != "$lock_hash" ]; then
		echo "Installing workspace dependencies..."
		# The base n8n image already provides its native runtime modules. The
		# workspace install only needs the node tooling and package dependencies;
		# skipping lifecycle scripts avoids rebuilding optional native modules such
		# as isolated-vm inside the minimal Alpine development image. Use install
		# here because the persistent Docker volume already contains most of the
		# dependency tree; npm ci needlessly rebuilds the full workspace and can
		# prevent n8n from reaching its startup command.
		npm install --include=dev --ignore-scripts --no-audit --no-fund --prefer-offline
		printf '%s\n' "$lock_hash" > "$dependency_marker"
	fi
}

check_workspaces() {
	echo "Checking all Wetomate workspaces..."
	npm run check:packages
	npm run build
	npm run lint
	npm test
}

configure_instance_owner() {
	if [ -z "${WETOMATE_N8N_PASSWORD:-}" ]; then
		return
	fi

	export N8N_INSTANCE_OWNER_MANAGED_BY_ENV=true
	export N8N_INSTANCE_OWNER_EMAIL=${WETOMATE_N8N_EMAIL:-dev@wetomate.local}
	export N8N_INSTANCE_OWNER_FIRST_NAME=${WETOMATE_N8N_FIRST_NAME:-Wetomate}
	export N8N_INSTANCE_OWNER_LAST_NAME=${WETOMATE_N8N_LAST_NAME:-Developer}
	export N8N_INSTANCE_OWNER_PASSWORD_HASH
	N8N_INSTANCE_OWNER_PASSWORD_HASH=$(
		node -e 'const bcrypt = require("/opt/wetomate-dev/node_modules/bcryptjs"); process.stdout.write(bcrypt.hashSync(process.env.WETOMATE_N8N_PASSWORD, 10));'
	)
	unset WETOMATE_N8N_PASSWORD
}

link_nodes() {
	mkdir -p "$custom_modules"
	linked_count=0

	for link_path in "$custom_modules"/n8n-nodes-*; do
		[ -L "$link_path" ] || continue
		link_target=$(readlink "$link_path")
		case "$link_target" in
			"$repository_root"/n8n-nodes-*) rm -f "$link_path" ;;
		esac
	done

	for package_directory in "$repository_root"/n8n-nodes-*; do
		package_manifest="$package_directory/package.json"
		[ -f "$package_manifest" ] || continue

		package_name=$(node -e "process.stdout.write(require(process.argv[1]).name);" "$package_manifest")
		case "$package_name" in
			n8n-nodes-*) ;;
			*)
				echo "Refusing to link unexpected node package name: $package_name" >&2
				exit 1
				;;
		esac

		link_path="$custom_modules/$package_name"
		if [ -e "$link_path" ] && [ ! -L "$link_path" ]; then
			echo "Refusing to replace non-symlink path: $link_path" >&2
			exit 1
		fi

		ln -sfn "$package_directory" "$link_path"
		linked_count=$((linked_count + 1))
	done

	if [ "$linked_count" -eq 0 ]; then
		echo "No n8n-nodes-* workspaces were found." >&2
		exit 1
	fi

	echo "Linked $linked_count node package(s) into $custom_modules."
}

seed_sample_workflows() {
	force=${1:-false}
	sample_workflow_file=$(mktemp "${TMPDIR:-/tmp}/wetomate-sample-workflows.XXXXXX")

	cleanup_sample_workflow_file() {
		rm -f "$sample_workflow_file"
	}
	trap cleanup_sample_workflow_file EXIT HUP INT TERM

	preparation_result=$(
		node "$repository_root/scripts/prepare-sample-workflows.js" \
			"$repository_root" \
			"$sample_workflow_file" \
			--development
	)
	set -- $preparation_result
	sample_workflow_hash=$1
	sample_workflow_count=$2

	if [ "$sample_workflow_count" -eq 0 ]; then
		echo "No sample workflows were found."
		cleanup_sample_workflow_file
		trap - EXIT HUP INT TERM
		return
	fi

	if [ "$force" != "true" ] && [ -f "$sample_workflow_marker" ] && \
		[ "$(sed -n '1p' "$sample_workflow_marker")" = "$sample_workflow_hash" ]; then
		echo "Sample workflows are already current."
		cleanup_sample_workflow_file
		trap - EXIT HUP INT TERM
		return
	fi

	echo "Importing $sample_workflow_count Wetomate sample workflow(s)..."
	n8n import:workflow --input="$sample_workflow_file" --activeState=false
	printf '%s\n' "$sample_workflow_hash" > "$sample_workflow_marker"

	cleanup_sample_workflow_file
	trap - EXIT HUP INT TERM
}

mode=${1:-start}
shift || true

case "$mode" in
	check)
		install_dependencies
		check_workspaces
		link_nodes
		;;
	seed)
		install_dependencies
		check_workspaces
		link_nodes
		seed_sample_workflows true
		;;
	start)
		install_dependencies
		check_workspaces
		link_nodes
		if [ "${WETOMATE_SEED_SAMPLE_WORKFLOWS:-true}" = "true" ]; then
			seed_sample_workflows false
		fi
		configure_instance_owner
		npm run dev:watch &
		node "$repository_root/scripts/watch-sample-workflows.js" "$repository_root" &
		exec /docker-entrypoint.sh "$@"
		;;
	shell)
		install_dependencies
		link_nodes
		exec /bin/sh "$@"
		;;
	*)
		echo "Usage: wetomate-dev-entrypoint [start|check|seed|shell]" >&2
		exit 2
		;;
esac

#!/bin/sh
# One-command installer for linux-magic-cli.
#
#   curl -fsSL https://raw.githubusercontent.com/6Nokturnal6/farmacoplants/main/scripts/install.sh | sh
#
# Options (as args when running the script directly):
#   --prefix DIR   install into DIR/bin (default: /usr/local, or ~/.local without root)
#   --uninstall    remove an installed copy
#   --version      print installer version

set -eu

INSTALLER_VERSION="1.0.0"
REPO_RAW="${LMC_SOURCE:-https://raw.githubusercontent.com/6Nokturnal6/farmacoplants/main}"
CLI_NAME="linux-magic-cli"
PREFIX=""
ACTION="install"

die() { echo "error: $*" >&2; exit 1; }
info() { echo "==> $*"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --prefix) PREFIX="${2:-}"; shift 2 ;;
    --prefix=*) PREFIX="${1#*=}"; shift ;;
    --uninstall) ACTION="uninstall"; shift ;;
    --version) echo "$INSTALLER_VERSION"; exit 0 ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) die "unknown option: $1" ;;
  esac
done

detect_distro() {
  if [ -r /etc/os-release ]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    echo "${PRETTY_NAME:-${NAME:-unknown}}"
  else
    uname -s
  fi
}

pkg_hint() {
  missing="$1"
  if command -v apt-get >/dev/null 2>&1; then echo "sudo apt-get install -y $missing"
  elif command -v dnf >/dev/null 2>&1; then echo "sudo dnf install -y $missing"
  elif command -v yum >/dev/null 2>&1; then echo "sudo yum install -y $missing"
  elif command -v pacman >/dev/null 2>&1; then echo "sudo pacman -S --noconfirm $missing"
  elif command -v zypper >/dev/null 2>&1; then echo "sudo zypper install -y $missing"
  elif command -v apk >/dev/null 2>&1; then echo "sudo apk add $missing"
  else echo "install '$missing' with your package manager"
  fi
}

resolve_prefix() {
  if [ -n "$PREFIX" ]; then return; fi
  if [ "$(id -u)" -eq 0 ]; then
    PREFIX="/usr/local"
  elif command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1; then
    PREFIX="/usr/local"
  else
    PREFIX="$HOME/.local"
  fi
}

as_root() {
  if [ "$(id -u)" -eq 0 ]; then "$@"
  elif command -v sudo >/dev/null 2>&1; then sudo "$@"
  else die "need root to write to $PREFIX (re-run with --prefix \$HOME/.local)"
  fi
}

write_file() {
  dest="$1"
  case "$PREFIX" in
    "$HOME"*) install -m 0755 "$TMP_CLI" "$dest" ;;
    *) as_root install -m 0755 "$TMP_CLI" "$dest" ;;
  esac
}

remove_file() {
  dest="$1"
  case "$PREFIX" in
    "$HOME"*) rm -f "$dest" ;;
    *) as_root rm -f "$dest" ;;
  esac
}

resolve_prefix
BIN_DIR="$PREFIX/bin"
TARGET="$BIN_DIR/$CLI_NAME"

if [ "$ACTION" = "uninstall" ]; then
  [ -e "$TARGET" ] || die "$CLI_NAME not found at $TARGET"
  remove_file "$TARGET"
  info "removed $TARGET"
  exit 0
fi

info "distro: $(detect_distro)"

for dep in curl; do
  command -v "$dep" >/dev/null 2>&1 || die "$dep is required — $(pkg_hint "$dep")"
done

command -v docker >/dev/null 2>&1 || \
  echo "warning: docker not found — install Docker 24+ before running '$CLI_NAME up'" >&2

TMP_CLI="$(mktemp)"
trap 'rm -f "$TMP_CLI"' EXIT

LOCAL_CLI="$(dirname "$0")/../cli/$CLI_NAME"
if [ -f "$LOCAL_CLI" ]; then
  info "using local copy: $LOCAL_CLI"
  cat "$LOCAL_CLI" > "$TMP_CLI"
else
  info "downloading $CLI_NAME"
  curl -fsSL "$REPO_RAW/cli/$CLI_NAME" -o "$TMP_CLI" || die "download failed from $REPO_RAW"
fi

head -n1 "$TMP_CLI" | grep -q '^#!' || die "downloaded file is not a script"
chmod +x "$TMP_CLI"

case "$PREFIX" in
  "$HOME"*) mkdir -p "$BIN_DIR" ;;
  *) as_root mkdir -p "$BIN_DIR" ;;
esac

write_file "$TARGET"
info "installed $CLI_NAME to $TARGET"

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) echo "note: $BIN_DIR is not on your PATH. Add it:"
     echo "  echo 'export PATH=\"$BIN_DIR:\$PATH\"' >> ~/.profile && . ~/.profile" ;;
esac

"$TARGET" version >/dev/null 2>&1 && info "run '$CLI_NAME help' to get started"

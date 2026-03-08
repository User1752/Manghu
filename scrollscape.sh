#!/usr/bin/env bash
# =============================================================================
# scrollscape.sh — ScrollScape launcher for Linux & macOS
# Usage: bash scrollscape.sh  (or chmod +x scrollscape.sh && ./scrollscape.sh)
# =============================================================================

set -euo pipefail

# ── ANSI colours ──────────────────────────────────────────────────────────────
R='\033[0m'
BOLD='\033[1m'
DIM='\033[2m'
PUR='\033[35m'
CYN='\033[36m'
GRN='\033[32m'
RED='\033[31m'
YLW='\033[33m'
WHT='\033[97m'

# ── Helpers ───────────────────────────────────────────────────────────────────

banner() {
  clear
  echo
  echo -e "  ${PUR}${BOLD}  M  A  N  G  H  U${R}"
  echo -e "  ${DIM}  ---------------------${R}"
  echo -e "  ${DIM}  Manga Reader  |  Docker  |  localhost:3000${R}"
  echo
}

status_box() {
  echo -e "  ${GRN}  [ OK ]  ScrollScape is running${R}"
  echo
  echo -e "        ${WHT}http://localhost:3000${R}"
  echo
}

err() {
  echo -e "  ${RED}  [ ERR ]${R}  $1"
  [ -n "${2:-}" ] && echo -e "  ${DIM}           $2${R}"
  echo
}

open_browser() {
  local url="http://localhost:3000"
  case "$(uname -s)" in
    Darwin)  open "$url" ;;
    Linux)
      if command -v xdg-open &>/dev/null; then
        xdg-open "$url" &>/dev/null &
      elif command -v sensible-browser &>/dev/null; then
        sensible-browser "$url" &>/dev/null &
      fi
      ;;
  esac
}

spin_docker() {
  local frames=('/' '-' '\' '|')
  local i=0
  echo -ne "  ${CYN}[ / ]${R}  Waiting for Docker daemon..."
  while ! docker info &>/dev/null 2>&1; do
    printf "\r  ${CYN}[ ${frames[$((i % 4))]} ]${R}  Waiting for Docker daemon..."
    sleep 1
    ((i++))
    if ((i > 60)); then
      echo
      err "Docker daemon did not start within 60 s." \
          "Start Docker manually and re-run this script."
      exit 1
    fi
  done
  printf "\r  ${GRN}[ OK ]${R}  Docker is ready.                    \n"
}

# ── 1. Require Docker ─────────────────────────────────────────────────────────
banner
if ! command -v docker &>/dev/null; then
  err "Docker not found." "Install it from https://docs.docker.com/get-docker/"
  exit 1
fi

# ── 2. Ensure Docker daemon is running ────────────────────────────────────────
if ! docker info &>/dev/null 2>&1; then
  echo -e "  ${YLW}[ ! ]${R}  Docker daemon is not running."
  case "$(uname -s)" in
    Darwin)
      echo -e "  ${DIM}       Trying to start Docker Desktop...${R}"
      open -a Docker 2>/dev/null || true
      ;;
    Linux)
      echo -e "  ${DIM}       Trying: sudo systemctl start docker${R}"
      sudo systemctl start docker 2>/dev/null || true
      ;;
  esac
  spin_docker
fi

# ── 3. Launch ─────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/docker"

banner
echo -e "  ${CYN}[ .. ]${R}  Building image and starting container..."
echo

if ! docker compose up -d --build; then
  err "Failed to start container." "Is Docker running? Check output above."
  exit 1
fi

echo
status_box
open_browser

# ── 4. Interactive menu ───────────────────────────────────────────────────────
while true; do
  echo -e "  ${DIM}  ------------------------------------------${R}"
  echo -e "  ${BOLD}${WHT}  [ R ]${R}  Rebuild & refresh"
  echo -e "  ${BOLD}${WHT}  [ Q ]${R}  Quit & stop server"
  echo
  read -rp "  > " choice
  case "${choice,,}" in
    r)
      banner
      echo -e "  ${CYN}[ .. ]${R}  Rebuilding..."
      echo
      if docker compose up -d --build; then
        echo
        echo -e "  ${GRN}[ OK ]${R}  Refreshed — http://localhost:3000"
      else
        err "Rebuild failed." "Check the output above for details."
      fi
      echo
      ;;
    q)
      echo
      echo -e "  ${CYN}[ .. ]${R}  Stopping ScrollScape..."
      docker compose down
      echo
      echo -e "  ${GRN}[ OK ]${R}  Server stopped. Goodbye!"
      echo
      exit 0
      ;;
    *)
      echo -e "  ${YLW}[ ? ]${R}  Press R to rebuild or Q to quit."
      echo
      ;;
  esac
done

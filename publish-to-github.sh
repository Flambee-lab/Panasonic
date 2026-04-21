#!/usr/bin/env bash
# Uso (una sola vez, después de: gh auth login):
#   ./publish-to-github.sh
# O con otro nombre de repo:
#   ./publish-to-github.sh mi-repo

set -e
cd "$(dirname "$0")"

if ! command -v gh >/dev/null 2>&1; then
  echo "Instalá GitHub CLI: brew install gh"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Primero iniciá sesión en GitHub en esta Mac:"
  echo "  gh auth login"
  exit 1
fi

REPO_NAME="${1:-Panasonic-config}"

if git remote get-url origin >/dev/null 2>&1; then
  echo "Ya existe 'origin'. Subiendo..."
  git push -u origin main
else
  echo "Creando repo '$REPO_NAME' y subiendo rama main..."
  gh repo create "$REPO_NAME" --public --source=. --remote=origin --push
fi

echo "Listo. Abrí el repo en GitHub desde la URL que mostró gh arriba."

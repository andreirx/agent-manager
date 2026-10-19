#!/bin/sh
# clean-slice-debug.sh — remove a relay's bulky debug output for accepted
# slices; keep the records (human directive, 2026-10-19: "clean up the debug
# folder after each slice").
#
# Usage: clean-slice-debug.sh <target-repo> <slice-id>... [--yes] [--scratch <dir>]
#
# Dry run by default: prints every path it would remove with its size.
# --yes removes them. Nothing under version control is touched: the relay's
# folder <target>/.agent-manager is git-ignored by its own .gitignore.
#
# Per slice:
#   KEEPS  .agent-manager/slices/<id>/{build-*.md, review-*.json,
#          notes-for-human.md, selection.json, selection.md, status.json,
#          build-progress.md, runs/, *.patch, *.sh}        — the record
#   REMOVES every other file and directory there (logs, event dumps, copied
#          binaries, baseline/after snapshots, test output)
#   REMOVES .agent-manager/logs/*__slice-<id>.txt — the providers' native
#          transcripts (the largest files; build-N.md / review-N.json are the
#          record of what they said)
# With --scratch <dir> (the manager's scratchpad): removes <dir>/*/chrome-profile
#   (headless Chrome profiles) and every *.png under <dir> (acceptance
#   screenshots); the text dumps and logs stay.
set -eu

usage() { echo "usage: $0 <target-repo> <slice-id>... [--yes] [--scratch <dir>]" >&2; exit 2; }
[ $# -ge 2 ] || usage
target=$1; shift
yes=0; scratch=""; slices=""
while [ $# -gt 0 ]; do
  case "$1" in
    --yes) yes=1 ;;
    --scratch) shift; [ $# -gt 0 ] || usage; scratch=$1 ;;
    -*) usage ;;
    *) slices="$slices $1" ;;
  esac
  shift
done
[ -n "$slices" ] || usage
am="$target/.agent-manager"
[ -d "$am" ] || { echo "no $am" >&2; exit 1; }

total=0
remove() {
  # $1: path. Prints it with its size; removes it when --yes.
  [ -e "$1" ] || return 0
  kb=$(du -sk "$1" | cut -f1)
  total=$((total + kb))
  printf '%8d KB  %s\n' "$kb" "$1"
  if [ "$yes" = 1 ]; then rm -rf "$1"; fi
}

for id in $slices; do
  dir="$am/slices/$id"
  if [ -d "$dir" ]; then
    for p in "$dir"/* "$dir"/.[!.]*; do
      [ -e "$p" ] || continue
      case "$(basename "$p")" in
        build-*.md|review-*.json|notes-for-human.md|selection.json|selection.md|status.json|build-progress.md|runs|*.patch|*.sh) ;;
        *) remove "$p" ;;
      esac
    done
  else
    echo "note: no slice directory $dir" >&2
  fi
  for p in "$am"/logs/*"__slice-$id.txt"; do
    [ -e "$p" ] || continue
    remove "$p"
  done
done

if [ -n "$scratch" ] && [ -d "$scratch" ]; then
  for p in "$scratch"/*/chrome-profile "$scratch"/*/*/chrome-profile; do
    [ -e "$p" ] || continue
    remove "$p"
  done
  find "$scratch" -name '*.png' -type f | while read -r p; do remove "$p"; done
fi

if [ "$yes" = 1 ]; then
  echo "removed: about $((total / 1024)) MB"
else
  echo "dry run: would remove about $((total / 1024)) MB (add --yes to remove)"
fi

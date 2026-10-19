find . -maxdepth 3 -type f \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  | sort
const lintStagedConfig = {
  "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{css,scss,json,md,yml,yaml}": ["prettier --write"],
}

export default lintStagedConfig

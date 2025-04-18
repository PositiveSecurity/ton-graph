#!/bin/bash

rm -rf ./package-lock.json
rm -rf ./node_modules
rm -rf ./vsix
rm -rf ./out
rm -rf ./cached

# Install dependencies
npm install

# Install vsce locally
npm install -D @vscode/vsce

# Compile the project
npm run compile

# Create cached directory if it doesn't exist
mkdir -p ./cached

# Create pic directory if it doesn't exist
mkdir -p ./pic

# Package the extension using local vsce
npx vsce package --allow-unused-files-pattern
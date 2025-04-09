#!/bin/bash

rm -rf ./package-lock.json
rm -rf ./node_modules
rm -rf ./vsix

npm install

# Compile the project
npm run compile

# Create directory for VSIX
mkdir -p ./vsix/extension

# Copy necessary files
cp -r ./out ./vsix/extension/
cp -r ./pic ./vsix/extension/
cp package.json README.md LICENSE ./vsix/extension/

# Create cached directory for Mermaid library
mkdir -p ./vsix/extension/cached

# Go to vsix directory
cd ./vsix

# Create manifest with updated version
echo '{
  "id": "ton-graph",
  "version": "0.2.1",
  "type": "Microsoft.VisualStudio.Code.Manifest",
  "manifestVersion": 1,
  "publisher": "positiveweb3",
  "engines": {
    "vscode": "^1.60.0"
  }
}' > extension.vsixmanifest

# Create VSIX file with new version
zip -r ../ton-graph-0.2.1.vsix extension extension.vsixmanifest

cd ../
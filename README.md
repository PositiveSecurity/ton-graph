# TON Graph

A Visual Studio Code extension for visualizing function call graphs in TON smart contracts written in FunC, Tact, and Tolk.

Developed by [PositiveWeb3](https://www.positive.com) security researchers.

<a href="https://raw.githubusercontent.com/PositiveSecurity/ton-graph/main/screenshots/scr01.jpg" target="_blank">
  <img src="https://raw.githubusercontent.com/PositiveSecurity/ton-graph/main/screenshots/scr01.jpg" width="400" alt="TON Graph visualization">
</a>

## Features

- Parse and visualize function call relationships in multiple contract types:
  - FunC (*.fc, *.func)
  - Tact (*.tact)
  - Tolk (*.tolk)
- Interactive diagram with cluster-based organization
- Zoom functionality for better navigation
- Filter functions by type (regular, impure, inline, method_id)
- Filter functions by name
- Export diagrams in multiple formats:
  - Mermaid (*.mmd)
  - SVG
  - PNG
  - JPG

<a href="https://raw.githubusercontent.com/PositiveSecurity/ton-graph/main/screenshots/scr05.jpg" target="_blank">
  <img src="https://raw.githubusercontent.com/PositiveSecurity/ton-graph/main/screenshots/scr05.jpg" width="400" alt="Export diagrams in multiple formats">
</a>

- Automatic color coding of different function clusters
- Bundled Mermaid library for offline use

## Installation

1. Open Visual Studio Code
2. Go to Extensions view (Ctrl+Shift+X)
3. Search for "TON Graph"
4. Click Install
5. Run "TON Graph: Set API Key" from the command palette and enter your Toncenter API key

## Usage

1. Open a contract file (*.fc, *.func, *.tact, or *.tolk)
2. You can visualize a contract in multiple ways:
   - Press F1 or Ctrl+Shift+P to open the command palette and type "TON Graph: Visualize Contract"
   - Right-click on contract code in the editor → TON Graph: Visualize Contract
   - Right-click on a contract file in the Explorer panel → TON Graph: Visualize Contract
3. The extension will analyze your contract and display a function call graph

### Visualizing Projects with Imports

You can also visualize an entire contract including all imports:

1. Open a main contract file (*.fc, *.func, *.tact, or *.tolk)
2. Visualize the project in one of these ways:
   - Press F1 or Ctrl+Shift+P and type "TON Graph: Visualize Contract with Imports"
   - Right-click on contract code in the editor → TON Graph: Visualize Contract with Imports
   - Right-click on a contract file in the Explorer panel → TON Graph: Visualize Contract with Imports
3. The extension will analyze the main contract and all its imports, displaying a complete function call graph

### Interactive Features

The visualization provides several interactive features:
- Zoom in/out for better detail view
- Pan and navigate through the diagram
- Filter functions by type

<a href="https://raw.githubusercontent.com/PositiveSecurity/ton-graph/main/screenshots/scr03.jpg" target="_blank">
  <img src="https://raw.githubusercontent.com/PositiveSecurity/ton-graph/main/screenshots/scr03.jpg" width="400" alt="Filter functions by type">
</a>

- Filter functions by name using the search bar
 
<a href="https://raw.githubusercontent.com/PositiveSecurity/ton-graph/main/screenshots/scr02.jpg" target="_blank">
  <img src="https://raw.githubusercontent.com/PositiveSecurity/ton-graph/main/screenshots/scr02.jpg" width="400" alt="Filter functions by name">
</a>

### Exporting

You can export the diagram in multiple formats:
- Mermaid: Save as a Mermaid markdown file (*.mmd)
- SVG: Vector graphics format for high-quality scaling
- PNG: Raster image format for general use
- JPG: Compressed image format for sharing

## How It Works

The extension analyzes your contract code to:
1. Identify all function declarations and their types
2. Detect function calls between these functions
3. Create a directed graph of function relationships
4. Generate a visual representation using [Mermaid](https://mermaid.js.org/) diagrams
5. Group related functions into clusters for better readability
6. Multiple contracts support (for Tact)

<a href="https://raw.githubusercontent.com/PositiveSecurity/ton-graph/main/screenshots/scr04.jpg" target="_blank">
  <img src="https://raw.githubusercontent.com/PositiveSecurity/ton-graph/main/screenshots/scr04.jpg" width="400" alt="Multiple contracts support">
</a>

## Development

### Project Structure

```
ton-graph/
├── src/
│   ├── extension.ts          # Extension entry point
│   ├── parser/               # Contract code parsing
│   │   ├── funcParser.ts     # FunC parser
│   │   ├── tactParser.ts     # Tact parser
│   │   ├── tolkParser.ts     # Tolk parser
│   │   └── parserUtils.ts    # Shared parser utilities
│   ├── types/                # Type definitions
│   │   └── graph.ts          # Graph data structures
│   ├── visualization/        # Visualization components
│   │   ├── visualizer.ts     # Diagram generation
│   │   └── templates.ts      # HTML templates
│   └── export/               # Export functionality
│       └── exportHandler.ts  # Export handlers
├── out/                      # Compiled output
└── cached/                   # Bundled Mermaid library
```

### Building From Source

```bash
# Clone the repository
git clone https://github.com/PositiveSecurity/ton-graph
# Install dependencies using the lockfile
npm ci

# Compile the extension
npm run compile

# Package the extension (creates a .vsix file)
chmod +x rebuild.sh && ./rebuild.sh

# The Mermaid library is bundled locally, so the build works offline
```

### Developing with Dev Containers

A Dev Container configuration is provided in `.devcontainer`.
To work with it:

1. Install the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension for VS Code.
2. Run **Remote-Containers: Open Folder in Container...** from the command palette and select this repository.
3. Wait for the container to build and dependencies to install.
4. Node dependencies are cached across rebuilds using a Docker volume mounted at `~/.npm`.
5. Docker build caching is enabled via the `cacheFrom` property to speed up subsequent builds.
6. You can now run `npm test` or other tasks inside the container.

### Logs

Runtime logs are written to `logs/extension.log` in the project root. The file
rotates when it reaches 1 MB and up to five log files are kept.

## Requirements

- Visual Studio Code 1.60.0 or newer

## Known Issues

- Large contracts with many functions may take longer to process
- Very complex call graphs may become cluttered - use filters to simplify the view

## Feedback and Contributions

We welcome your feedback and contributions to improve this extension!

- File issues and suggestions [on GitHub](https://github.com/PositiveSecurity/ton-graph/issues)
- Fork the repository and submit pull requests

## License

[MIT](LICENSE)
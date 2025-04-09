# TON Graph

A Visual Studio Code extension for visualizing function call graphs in TON smart contracts written in FunC, TACT, and TOLK.

Developed by [PosuitiveWeb3](https://positive.com)

## Features

- Parse and visualize function call relationships in multiple contract types:
  - FunC (*.fc)
  - TACT (*.tact)
  - TOLK (*.tolk)
- Interactive diagram with cluster-based organization
- Zoom functionality for better navigation
- Filter functions by type (regular, impure, inline, method_id)
- Search functions by name
- Export diagrams in multiple formats:
  - Mermaid (*.mmd)
  - SVG
  - PNG
  - JPG
- Automatic color coding of different function clusters
- Optimized performance with Mermaid library caching

## Installation

1. Open Visual Studio Code
2. Go to Extensions view (Ctrl+Shift+X)
3. Search for "TON Graph"
4. Click Install

## Usage

1. Open a contract file (*.fc, *.tact, or *.tolk)
2. Press F1 or Ctrl+Shift+P to open the command palette
3. Type "TON Graph: Visualize Contract" and press Enter
or Use right click on contract code -> TON Graph: Visualize Contract
4. The extension will analyze your contract and display a function call graph

### Interactive Features

The visualization provides several interactive features:
- Zoom in/out for better detail view
- Pan and navigate through the diagram
- Filter functions by type
- Filter functions by name using the search bar

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
6. Cache Mermaid library locally for improved performance


## Development

### Project Structure

```
ton-graph/
├── src/
│   ├── extension.ts          # Extension entry point
│   ├── parser/               # Contract code parsing
│   │   ├── funcParser.ts     # FunC parser
│   │   ├── tactParser.ts     # TACT parser
│   │   ├── tolkParser.ts     # TOLK parser
│   │   └── parserUtils.ts    # Shared parser utilities
│   ├── types/                # Type definitions
│   │   └── graph.ts          # Graph data structures
│   ├── visualization/        # Visualization components
│   │   ├── visualizer.ts     # Diagram generation
│   │   └── templates.ts      # HTML templates
│   └── export/               # Export functionality
│       └── exportHandler.ts  # Export handlers
├── out/                      # Compiled output
└── cached/                   # Cache directory for Mermaid library
```

### Building From Source

```bash
# Clone the repository
git clone https://github.com/PositiveSecurity/ton-graph
# Install dependencies
npm install

# Compile the extension
npm run compile

# Package the extension (creates a .vsix file)
./rebuild.sh
```

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
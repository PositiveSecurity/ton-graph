export const VISUALIZATION_TEMPLATE = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TON Graph</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                background-color: #f5f5f5;
            }
            .container {
                display: flex;
                flex-direction: column;
                height: 100vh;
                padding: 20px;
                box-sizing: border-box;
                position: relative;
            }
            .controls-top {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding: 10px;
                background-color: white;
                border-radius: 5px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .controls-bottom {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 10px;
                padding: 10px;
                background-color: white;
                border-radius: 5px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .mermaid-container {
                flex: 1;
                overflow: auto;
                background-color: white;
                border-radius: 5px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                padding: 20px;
                position: relative;
                margin-bottom: 10px;
            }
            .filter-section {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .filter-option {
                display: flex;
                align-items: center;
                gap: 5px;
            }
            .filter-option input[type="checkbox"] {
                margin: 0;
            }
            .filter-option label {
                font-size: 14px;
                color: #333;
            }
            .name-filter {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .name-filter input {
                padding: 5px;
                border: 1px solid #ddd;
                border-radius: 3px;
                font-size: 14px;
            }
            .name-filter button {
                padding: 5px 10px;
                background-color: #007acc;
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
                font-size: 14px;
            }
            .name-filter button:hover {
                background-color: #005999;
            }
            .zoom-controls {
                display: flex;
                gap: 5px;
            }
            .zoom-controls button {
                padding: 5px 10px;
                background-color: #007acc;
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
                font-size: 14px;
            }
            .zoom-controls button:hover {
                background-color: #005999;
            }
            .dropdown {
                position: relative;
                display: inline-block;
            }
            .dropdown-btn {
                padding: 5px 10px;
                background-color: #007acc;
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
                font-size: 14px;
            }
            .dropdown-btn:hover {
                background-color: #005999;
            }
            .dropdown-content {
                display: none;
                position: absolute;
                right: 0;
                background-color: white;
                min-width: 160px;
                box-shadow: 0 8px 16px rgba(0,0,0,0.2);
                z-index: 1;
                border-radius: 3px;
            }
            .dropdown:hover .dropdown-content {
                display: block;
            }
            .dropdown-content button {
                width: 100%;
                padding: 8px 16px;
                text-align: left;
                background: none;
                border: none;
                color: #333;
                cursor: pointer;
                font-size: 14px;
            }
            .dropdown-content button:hover {
                background-color: #f5f5f5;
            }
            .log-container {
                position: relative;
                margin-top: 10px;
                height: 80px;
                background-color: rgba(0,0,0,0.8);
                color: white;
                padding: 10px;
                font-family: monospace;
                font-size: 12px;
                overflow-y: auto;
                border-radius: 5px;
                display: block;
            }
            .log-entry {
                margin: 2px 0;
                padding: 2px 5px;
            }
            .log-info {
                color: #fff;
            }
            .log-success {
                color: #4CAF50;
            }
            .log-error {
                color: #f44336;
            }
            .code-display {
                display: none;
                background-color: #1e1e1e;
                color: #d4d4d4;
                padding: 20px;
                border-radius: 5px;
                font-family: 'Consolas', 'Monaco', monospace;
                white-space: pre-wrap;
                overflow-x: auto;
                margin-top: 20px;
            }
            .error-container {
                display: none;
                background-color: #ffebee;
                color: #c62828;
                padding: 10px;
                margin: 10px 0;
                border-radius: 3px;
            }
            #downloadLink {
                display: none;
            }
            .pre-rendered-svg {
                width: 100%;
                height: 100%;
                overflow: auto;
            }
            .pre-rendered-svg svg {
                width: 100%;
                height: 100%;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="controls-top">
                <div class="filter-section">
                    <div id="typeFilters" class="filter-options"></div>
                    <div class="name-filter">
                        <input type="text" id="nameFilter" placeholder="Filter by name...">
                        <button id="applyNameFilterBtn">Apply</button>
                    </div>
                </div>
            </div>
            <div class="mermaid-container">
                <div class="error-container" id="errorContainer"></div>
                <div class="mermaid" id="mermaid-diagram">{{MERMAID_DIAGRAM}}</div>
            </div>
            <div class="controls-bottom">
                <div class="zoom-controls">
                    <button id="zoomInBtn">+</button>
                    <button id="zoomOutBtn">-</button>
                    <button id="resetZoomBtn">Reset Zoom</button>
                    <button id="showCodeBtn">Show Code</button>
                </div>
                <div class="dropdown">
                    <button class="dropdown-btn">Export</button>
                    <div class="dropdown-content">
                        <button id="exportMermaid">Export as Mermaid</button>
                        <button id="exportSvg">Export as SVG</button>
                        <button id="exportPng">Export as PNG</button>
                        <button id="exportJpg">Export as JPG</button>
                    </div>
                </div>
            </div>
            <div class="log-container" id="logContainer"></div>
            <div id="codeDisplay" class="code-display"></div>
            <canvas id="imageCanvas" style="display:none;"></canvas>
            <a id="downloadLink" style="display: none;">Download</a>
        </div>
        <script>window.filterSet = {{FILTERS_JSON}};</script>
        <script src="{{MERMAID_SCRIPT_URI}}"></script>
        <script src="{{WEBVIEW_SCRIPT_URI}}"></script>
    </body>
    </html>`;

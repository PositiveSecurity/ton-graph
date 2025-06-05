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
        <script src="{{MERMAID_SCRIPT_URI}}"></script>
        <script>
            var currentZoom = 1;
            var zoomStep = 0.05;
            var filterSet = {{FILTERS_JSON}};
            var selectedFilters = [];
            function initializeFilters() {
                var typeFiltersContainer = document.getElementById('typeFilters');
                typeFiltersContainer.innerHTML = '';
                filterSet.forEach(function(filter) {
                    var filterDiv = document.createElement('div');
                    filterDiv.className = 'filter-option';
                    var checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = 'filter-' + filter.value;
                    checkbox.value = filter.value;
                    checkbox.checked = true;
                    var label = document.createElement('label');
                    label.htmlFor = 'filter-' + filter.value;
                    label.textContent = filter.label;
                    filterDiv.appendChild(checkbox);
                    filterDiv.appendChild(label);
                    typeFiltersContainer.appendChild(filterDiv);
                    checkbox.addEventListener('change', function() {
                        updateSelectedFilters();
                    });
                });
                updateSelectedFilters();
            }
            function updateSelectedFilters() {
                var checkboxes = document.querySelectorAll('#typeFilters input[type="checkbox"]');
                selectedFilters = Array.from(checkboxes)
                    .filter(function(cb) { return cb.checked; })
                    .map(function(cb) { return cb.value; });
                applyFilters();
            }
            function applyFilters() {
                var nameFilter = document.getElementById('nameFilter').value.trim();
                vscode.postMessage({
                    command: 'applyFilters',
                    selectedTypes: selectedFilters,
                    nameFilter: nameFilter
                });
                logMessage('Applying filters...', 'info');
            }
            mermaid.initialize({
                startOnLoad: false,
                securityLevel: 'loose',
                theme: 'default',
                fontSize: 14,
                flowchart: {
                    nodeSpacing: 15,
                    rankSpacing: 15,
                    curve: 'basis',
                    useMaxWidth: false,
                    htmlLabels: true
                }
            });
            mermaid.render('mermaid-diagram-svg', document.getElementById('mermaid-diagram').textContent).then(function(result) {
                const originalCode = document.getElementById('mermaid-diagram').textContent;
                document.getElementById('mermaid-diagram').setAttribute('data-original-code', originalCode);
                document.getElementById('mermaid-diagram').innerHTML = result.svg;
                setupPanZoom();
                logMessage('Diagram rendered successfully', 'success');
            }).catch(function(error) {
                document.getElementById('errorContainer').textContent = 'Error rendering diagram: ' + error;
                document.getElementById('errorContainer').style.display = 'block';
                logMessage('Error rendering diagram: ' + error, 'error');
            });
            var vscode = acquireVsCodeApi();
            window.addEventListener('message', function(event) {
                var message = event.data;
                switch (message.command) {
                    case 'updateDiagram':
                        const mermaidDiagram = document.getElementById('mermaid-diagram');
                        mermaidDiagram.textContent = message.diagram;
                        mermaidDiagram.setAttribute('data-original-code', message.diagram);
                        const fontSize = 14;
                        const nodeSpacing = 15;
                        const rankSpacing = 15;
                        mermaid.initialize({
                            startOnLoad: false,
                            securityLevel: 'loose',
                            theme: 'default',
                            fontSize: fontSize,
                            maxTextSize: 9000000,
                            flowchart: {
                                nodeSpacing: nodeSpacing,
                                rankSpacing: rankSpacing,
                                curve: 'basis',
                                useMaxWidth: false,
                                htmlLabels: true
                            }
                        });
                        mermaid.render('mermaid-diagram-svg', message.diagram).then(function(result) {
                            mermaidDiagram.innerHTML = result.svg;
                            setupPanZoom();
                            logMessage('Diagram updated with filters', 'success');
                        }).catch(function(error) {
                            document.getElementById('errorContainer').textContent = 'Error updating diagram: ' + error;
                            document.getElementById('errorContainer').style.display = 'block';
                            logMessage('Error updating diagram: ' + error, 'error');
                        });
                        break;
                    case 'filterError':
                        document.getElementById('errorContainer').textContent = message.error;
                        document.getElementById('errorContainer').style.display = 'block';
                        logMessage('Filter error: ' + message.error, 'error');
                        break;
                }
            });
            function logMessage(message, type) {
                var logContainer = document.getElementById('logContainer');
                var logEntry = document.createElement('div');
                logEntry.className = 'log-entry log-' + type;
                logEntry.textContent = message;
                logContainer.appendChild(logEntry);
                logContainer.scrollTop = logContainer.scrollHeight;
            }
            function setupPanZoom() {
                var svg = document.querySelector('.mermaid svg');
                if (!svg) return;
                enhanceSvgQuality(svg);
                document.getElementById('zoomInBtn').addEventListener('click', function() {
                    const oldZoom = currentZoom;
                    currentZoom = Math.min(5, currentZoom + zoomStep);
                    applyZoom();
                    const container = document.querySelector('.mermaid-container');
                    const centerX = container.clientWidth / 2;
                    const centerY = container.clientHeight / 2;
                    const scrollXTarget = centerX + container.scrollLeft;
                    const scrollYTarget = centerY + container.scrollTop;
                    container.scrollLeft = scrollXTarget * (currentZoom / oldZoom) - centerX;
                    container.scrollTop = scrollYTarget * (currentZoom / oldZoom) - centerY;
                });
                document.getElementById('zoomOutBtn').addEventListener('click', function() {
                    const oldZoom = currentZoom;
                    currentZoom = Math.max(0.05, currentZoom - 0.1);
                    applyZoom();
                    const container = document.querySelector('.mermaid-container');
                    const centerX = container.clientWidth / 2;
                    const centerY = container.clientHeight / 2;
                    const scrollXTarget = centerX + container.scrollLeft;
                    const scrollYTarget = centerY + container.scrollTop;
                    container.scrollLeft = scrollXTarget * (currentZoom / oldZoom) - centerX;
                    container.scrollTop = scrollYTarget * (currentZoom / oldZoom) - centerY;
                });
                document.getElementById('resetZoomBtn').addEventListener('click', resetZoom);
                document.getElementById('showCodeBtn').addEventListener('click', function() {
                    toggleCodeDisplay();
                });
            }
            function enhanceSvgQuality(svg) {
                svg.style.imageRendering = 'optimizeQuality';
                svg.style.shapeRendering = 'geometricPrecision';
                svg.style.textRendering = 'geometricPrecision';
                svg.style.webkitFontSmoothing = 'antialiased';
                svg.style.mozOsxFontSmoothing = 'grayscale';
                const textElements = svg.querySelectorAll('text');
                textElements.forEach(function(text) {
                    text.style.fontKerning = 'normal';
                    text.style.fontVariantLigatures = 'common-ligatures';
                    text.style.fontFamily = "'Arial', 'Helvetica', sans-serif";
                    text.style.fontWeight = "normal";
                });
                const edges = svg.querySelectorAll('.edgePath path');
                edges.forEach(function(edge) {
                    edge.style.shapeRendering = 'geometricPrecision';
                    edge.style.strokeWidth = '1.5px';
                });
                const clusters = svg.querySelectorAll('.cluster rect');
                clusters.forEach(function(rect) {
                    rect.style.strokeWidth = '1px';
                    rect.style.stroke = '#999';
                });
            }
            function applyZoom() {
                var svg = document.querySelector('.mermaid svg');
                if (!svg) return;
                svg.style.transform = 'scale(' + currentZoom + ')';
                svg.style.transformOrigin = '0 0';
                svg.style.webkitFontSmoothing = 'antialiased';
                svg.style.mozOsxFontSmoothing = 'grayscale';
                enhanceSvgQuality(svg);
            }
            function resetZoom() {
                currentZoom = 1;
                var svg = document.querySelector('.mermaid svg');
                if (svg) {
                    svg.style.transform = 'scale(1)';
                }
                var container = document.querySelector('.mermaid-container');
                container.scrollLeft = 0;
                container.scrollTop = 0;
            }
            function toggleCodeDisplay() {
                var codeDisplay = document.getElementById('codeDisplay');
                var mermaidContainer = document.querySelector('.mermaid-container');
                var originalMermaidCode = document.getElementById('mermaid-diagram').getAttribute('data-original-code') || '';
                if (codeDisplay.style.display === 'block') {
                    codeDisplay.style.display = 'none';
                    mermaidContainer.style.display = 'block';
                    document.getElementById('showCodeBtn').textContent = 'Show Code';
                } else {
                    codeDisplay.textContent = originalMermaidCode;
                    codeDisplay.style.display = 'block';
                    mermaidContainer.style.display = 'none';
                    document.getElementById('showCodeBtn').textContent = 'Show Diagram';
                }
            }
        </script>
    </body>
    </html>`;

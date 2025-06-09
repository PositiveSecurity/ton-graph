import { logger } from '../logger';

export function generateVisualizationHtml(mermaidDiagram: string, mermaidScriptUri: string, functionTypeFilters: { value: string; label: string; }[]): string {
    // Create JSON string for filter set
    const filtersJson = JSON.stringify(functionTypeFilters);

    return `<!DOCTYPE html>
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
                right: 0; /* Align to the right */
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
            <!-- Top controls block (filters) -->
            <div class="controls-top">
                <div class="filter-section">
                    <div id="typeFilters" class="filter-options">
                        <!-- Filter checkboxes will be added here dynamically -->
            </div>
                    <div class="name-filter">
                        <input type="text" id="nameFilter" placeholder="Filter by name...">
                        <button id="applyNameFilterBtn">Apply</button>
                    </div>
                    </div>
                </div>
                
            <!-- Main visualization area -->
            <div class="mermaid-container">
                <div class="error-container" id="errorContainer"></div>
                <div class="mermaid" id="mermaid-diagram">${mermaidDiagram}</div>
            </div>

            <!-- Bottom controls block (zoom, export) -->
            <div class="controls-bottom">
                <!-- Zoom controls -->
                <div class="zoom-controls">
                    <button id="zoomInBtn">+</button>
                    <button id="zoomOutBtn">-</button>
                    <button id="resetZoomBtn">Reset Zoom</button>
                    <button id="showCodeBtn">Show Code</button>
                </div>

                <!-- Export controls -->
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

            <!-- Log container -->
            <div class="log-container" id="logContainer"></div>

            <!-- Code display for exports -->
            <div id="codeDisplay" class="code-display"></div>

            <!-- Canvas for image conversion -->
            <canvas id="imageCanvas" style="display:none;"></canvas>

            <!-- Hidden download link -->
            <a id="downloadLink" style="display: none;">Download</a>
        </div>

        <script src="${mermaidScriptUri}"></script>
        <script>
            // Store current zoom level
            var currentZoom = 1;
            var zoomStep = 0.05; // Use 5% increments for zoom

            // Define filter set
            var filterSet = ${filtersJson};
            
            // Selected filters (start with all selected)
            var selectedFilters = [];
            
            // Initialize filters
            function initializeFilters() {
                var typeFiltersContainer = document.getElementById('typeFilters');
                
                // Clear existing filters
                typeFiltersContainer.innerHTML = '';
                
                // Create checkbox for each filter
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
                    
                    // Add event listener
                    checkbox.addEventListener('change', function() {
                        updateSelectedFilters();
                    });
                });
                
                // Update selected filters
                updateSelectedFilters();
            }
            
            // Update selected filters based on checkboxes
            function updateSelectedFilters() {
                var checkboxes = document.querySelectorAll('#typeFilters input[type="checkbox"]');
                selectedFilters = Array.from(checkboxes)
                    .filter(function(cb) { return cb.checked; })
                    .map(function(cb) { return cb.value; });
                
                // Apply filters immediately
                applyFilters();
            }
            
            // Apply both type and name filters
            function applyFilters() {
                var nameFilter = document.getElementById('nameFilter').value.trim();
                
                vscode.postMessage({
                    command: 'applyFilters',
                    selectedTypes: selectedFilters,
                    nameFilter: nameFilter
                });
                
                logMessage('Applying filters...', 'info');
            }
            
            // Initialize mermaid
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

            // Render the initial diagram with Promise API (for Mermaid 11.6.0)
            mermaid.render('mermaid-diagram-svg', document.getElementById('mermaid-diagram').textContent).then(function(result) {
                // Store the original code before replacing with SVG
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

            // VSCode message handling
            var vscode = acquireVsCodeApi();
            
            window.addEventListener('message', function(event) {
                var message = event.data;
                
                switch (message.command) {
                    case 'updateDiagram':
                        // Update the diagram with new filtered content
                        const mermaidDiagram = document.getElementById('mermaid-diagram');
                        mermaidDiagram.textContent = message.diagram;
                        // Store the filtered diagram code
                        mermaidDiagram.setAttribute('data-original-code', message.diagram);
                        
                        // Configure mermaid with optimal settings
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
                        
                        // Use Promise-based API (for Mermaid 11.6.0)
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
                        // Display filter error
                        document.getElementById('errorContainer').textContent = message.error;
                        document.getElementById('errorContainer').style.display = 'block';
                        logMessage('Filter error: ' + message.error, 'error');
                        break;
                }
            });

            // Logging functionality
            function logMessage(message, type) {
                if (!type) type = 'info';
                var logContainer = document.getElementById('logContainer');
                var logEntry = document.createElement('div');
                logEntry.className = 'log-entry log-' + type;
                
                // Add timestamp
                var now = new Date();
                var timestamp = now.toLocaleTimeString();
                
                logEntry.textContent = '[' + timestamp + '] ' + message;
                logContainer.appendChild(logEntry);
                
                // Auto-scroll to bottom
                logContainer.scrollTop = logContainer.scrollHeight;
            }
            
            // Pan and zoom functionality
            var isPanning = false;
            var startPoint = { x: 0, y: 0 };
            var endPoint = { x: 0, y: 0 };
            
            function setupPanZoom() {
                var container = document.querySelector('.mermaid-container');
                var svg = container.querySelector('svg');
                
                if (!svg) {
                    logMessage('SVG not found for pan/zoom setup', 'error');
                    return;
                }

                // Set up SVG properties
                svg.setAttribute('width', '100%');
                svg.setAttribute('height', '100%');
                svg.style.cursor = 'grab';
                
                // Apply high-quality rendering settings
                enhanceSvgQuality(svg);
                
                // Mouse wheel zoom
                container.addEventListener('wheel', function(e) {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? -1 : 1;
                    const zoom = delta > 0 ? zoomStep : -zoomStep;
                    
                    // Calculate zoom center based on mouse position
                    const containerRect = container.getBoundingClientRect();
                    const mouseX = e.clientX - containerRect.left;
                    const mouseY = e.clientY - containerRect.top;
                    
                    // Get scroll position before zoom
                    const oldScrollLeft = container.scrollLeft;
                    const oldScrollTop = container.scrollTop;
                    const oldZoom = currentZoom;
                    
                    // Apply new zoom
                    currentZoom = Math.max(0.05, Math.min(5, currentZoom + zoom));
                    applyZoom();
                    
                    // Adjust scroll to zoom toward the mouse pointer
                    const scrollXTarget = mouseX + oldScrollLeft;
                    const scrollYTarget = mouseY + oldScrollTop;
                    container.scrollLeft = scrollXTarget * (currentZoom / oldZoom) - mouseX;
                    container.scrollTop = scrollYTarget * (currentZoom / oldZoom) - mouseY;
                });
                
                // Pan functionality
                container.addEventListener('mousedown', function(e) {
                    if (e.button === 0) { // Left mouse button
                        isPanning = true;
                        startPoint = { x: e.clientX, y: e.clientY };
                        container.style.cursor = 'grabbing';
                    }
                });
                
                document.addEventListener('mousemove', function(e) {
                        if (isPanning) {
                        endPoint = { x: e.clientX, y: e.clientY };
                        const dx = endPoint.x - startPoint.x;
                        const dy = endPoint.y - startPoint.y;
                        
                        container.scrollLeft -= dx;
                        container.scrollTop -= dy;
                        
                        startPoint = { x: e.clientX, y: e.clientY };
                    }
                });
                
                document.addEventListener('mouseup', function() {
                            isPanning = false;
                    container.style.cursor = 'grab';
                });
                
                // Set up zoom buttons
                document.getElementById('zoomInBtn').addEventListener('click', function() {
                    const oldZoom = currentZoom;
                    currentZoom = Math.min(5, currentZoom + 0.1); // Larger step for buttons (10%)
                    applyZoom();
                    
                    // Zoom toward center
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
                    currentZoom = Math.max(0.05, currentZoom - 0.1); // Larger step for buttons (10%)
                    applyZoom();
                    
                    // Zoom toward center
                    const container = document.querySelector('.mermaid-container');
                    const centerX = container.clientWidth / 2;
                    const centerY = container.clientHeight / 2;
                    const scrollXTarget = centerX + container.scrollLeft;
                    const scrollYTarget = centerY + container.scrollTop;
                    container.scrollLeft = scrollXTarget * (currentZoom / oldZoom) - centerX;
                    container.scrollTop = scrollYTarget * (currentZoom / oldZoom) - centerY;
                });
                
                document.getElementById('resetZoomBtn').addEventListener('click', resetZoom);
                
                // Show code button
                document.getElementById('showCodeBtn').addEventListener('click', function() {
                    toggleCodeDisplay();
                });
            }
            
            function enhanceSvgQuality(svg) {
                // Apply high-quality rendering settings
                svg.style.imageRendering = 'optimizeQuality';
                svg.style.shapeRendering = 'geometricPrecision';
                svg.style.textRendering = 'geometricPrecision';
                
                // Enable font-smoothing
                svg.style.webkitFontSmoothing = 'antialiased';
                svg.style.mozOsxFontSmoothing = 'grayscale';
                
                // Add text quality improvements
                const textElements = svg.querySelectorAll('text');
                textElements.forEach(function(text) {
                    text.style.fontKerning = 'normal';
                    text.style.fontVariantLigatures = 'common-ligatures';
                    text.style.fontFamily = "'Arial', 'Helvetica', sans-serif";
                    text.style.fontWeight = "normal";
                });
                
                // Fix rendering of edges
                const edges = svg.querySelectorAll('.edgePath path');
                edges.forEach(function(edge) {
                    edge.style.shapeRendering = 'geometricPrecision';
                    edge.style.strokeWidth = '1.5px';
                });
                
                // Make cluster borders more visible
                const clusters = svg.querySelectorAll('.cluster rect');
                clusters.forEach(function(rect) {
                    rect.style.strokeWidth = '1px';
                    rect.style.stroke = '#999';
                });
            }
            
            function applyZoom() {
                var svg = document.querySelector('.mermaid svg');
                if (!svg) return;
                
                // Apply transform with high-quality rendering
                svg.style.transform = 'scale(' + currentZoom + ')';
                svg.style.transformOrigin = '0 0';
                
                // Apply text anti-aliasing
                svg.style.webkitFontSmoothing = 'antialiased';
                svg.style.mozOsxFontSmoothing = 'grayscale';
                
                // Re-apply quality enhancements
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
            
            // Toggle display of mermaid code
            function toggleCodeDisplay() {
                var codeDisplay = document.getElementById('codeDisplay');
                var mermaidContainer = document.querySelector('.mermaid-container');
                // Get the original Mermaid code, not the rendered SVG
                var originalMermaidCode = document.getElementById('mermaid-diagram').getAttribute('data-original-code') || '';
                
                if (codeDisplay.style.display === 'block') {
                    codeDisplay.style.display = 'none';
                    mermaidContainer.style.display = 'block';
                    document.getElementById('showCodeBtn').textContent = 'Show Code';
                } else {
                    // Format the code for display
                    codeDisplay.textContent = originalMermaidCode;
                    codeDisplay.style.display = 'block';
                    mermaidContainer.style.display = 'none';
                    document.getElementById('showCodeBtn').textContent = 'Show Diagram';
                }
            }
            
            // Export functionality
            document.getElementById('exportMermaid').addEventListener('click', function() {
                vscode.postMessage({ command: 'saveMermaid' });
            });
            
            document.getElementById('exportSvg').addEventListener('click', function() {
                vscode.postMessage({ command: 'saveSvg' });
            });
            
            document.getElementById('exportPng').addEventListener('click', function() {
                const svgElement = document.querySelector('.mermaid svg');
                if (svgElement) {
                    const svgContent = svgElement.outerHTML;
                    vscode.postMessage({ 
                        command: 'savePng',
                        content: svgContent
                    });
                }
            });
            
            document.getElementById('exportJpg').addEventListener('click', function() {
                const svgElement = document.querySelector('.mermaid svg');
                if (svgElement) {
                    const svgContent = svgElement.outerHTML;
                    vscode.postMessage({ 
                        command: 'saveJpg',
                        content: svgContent
                    });
                }
            });
            
            // Name filter button
            document.getElementById('applyNameFilterBtn').addEventListener('click', applyFilters);
            
            // Also apply when pressing Enter in the name filter field
            document.getElementById('nameFilter').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    applyFilters();
                }
            });
            
            // Initialize the filters at startup
            initializeFilters();

            // Add message handlers for export functionality
            window.addEventListener('message', function(event) {
                var message = event.data;
                
                switch (message.command) {
                    case 'getMermaidContent':
                        // Get the original Mermaid code
                        const mermaidCode = document.getElementById('mermaid-diagram').getAttribute('data-original-code') || '';
                        vscode.postMessage({
                            command: 'mermaidContent',
                            content: mermaidCode
                        });
                        break;
                        
                    case 'getSvgContent':
                        // Get the current SVG content
                        const svgElement = document.querySelector('.mermaid svg');
                        if (svgElement) {
                            const svgContent = svgElement.outerHTML;
                            vscode.postMessage({
                                command: 'svgContent',
                                content: svgContent
                            });
                        }
                        break;
                        
                    case 'convertToPng':
                        try {
                            // Convert SVG to PNG
                            const svgForPng = document.querySelector('.mermaid svg');
                            if (!svgForPng) {
                                logMessage('Error: SVG element not found for PNG conversion', 'error');
                                return;
                            }

                            logMessage('Starting PNG conversion...', 'info');
                            
                            const canvas = document.getElementById('imageCanvas');
                            const ctx = canvas.getContext('2d');
                            
                            // Store original transform to restore later
                            const originalTransform = svgForPng.style.transform;
                            
                            // Temporarily reset transform for full capture
                            svgForPng.style.transform = 'scale(1)';
                            
                            // Get the full SVG dimensions - using the viewBox if available
                            const viewBox = svgForPng.getAttribute('viewBox');
                            let svgWidth, svgHeight;
                            
                            if (viewBox) {
                                const viewBoxValues = viewBox.split(' ').map(Number);
                                svgWidth = viewBoxValues[2];
                                svgHeight = viewBoxValues[3];
                                logMessage('Using viewBox dimensions: ' + svgWidth + 'x' + svgHeight, 'info');
                            } else {
                                // Fallback to getBoundingClientRect
                                const svgRect = svgForPng.getBoundingClientRect();
                                svgWidth = svgRect.width;
                                svgHeight = svgRect.height;
                                logMessage('Using getBoundingClientRect dimensions: ' + svgWidth + 'x' + svgHeight, 'info');
                            }
                            
                            // Calculate scale based on complexity - more nodes = higher scale
                            const nodes = svgForPng.querySelectorAll('.node').length;
                            const textElements = svgForPng.querySelectorAll('text').length;
                            
                            // Base scale factor is 3, increase if there are many nodes or text elements
                            let scale = 3;
                            if (nodes > 20 || textElements > 50) scale = 4;
                            if (nodes > 50 || textElements > 100) scale = 5;
                            if (nodes > 100 || textElements > 200) scale = 6;
                            
                            logMessage('Using scale factor ' + scale + 'x (' + nodes + ' nodes, ' + textElements + ' text elements)', 'info');
                            
                            // Ensure reasonable canvas dimensions
                            const maxDimension = 16384; // Max canvas size most browsers support
                            
                            // Calculate desired dimensions
                            const desiredWidth = svgWidth * scale;
                            const desiredHeight = svgHeight * scale;
                            
                            // Calculate aspect ratio
                            const aspectRatio = svgWidth / svgHeight;
                            
                            // Determine canvas dimensions based on aspect ratio
                            let canvasWidth, canvasHeight;
                            
                            if (aspectRatio > 1) {
                                // Landscape orientation (wider than tall)
                                canvasWidth = Math.min(desiredWidth, maxDimension);
                                canvasHeight = Math.min(canvasWidth / aspectRatio, maxDimension);
                            } else {
                                // Portrait orientation (taller than wide)
                                canvasHeight = Math.min(desiredHeight, maxDimension);
                                canvasWidth = Math.min(canvasHeight * aspectRatio, maxDimension);
                            }
                            
                            // Set canvas size
                            canvas.width = canvasWidth;
                            canvas.height = canvasHeight;
                            
                            // Calculate effective scale if dimensions were constrained
                            const effectiveWidthScale = canvasWidth / svgWidth;
                            const effectiveHeightScale = canvasHeight / svgHeight;
                            const effectiveScale = Math.min(effectiveWidthScale, effectiveHeightScale);
                            
                            logMessage('Canvas dimensions: ' + canvasWidth + 'x' + canvasHeight + ', effective scale: ' + effectiveScale, 'info');
                            
                            // Create SVG data URL
                            const svgData = new XMLSerializer().serializeToString(svgForPng);
                            
                            // Handle potential DOM parsing errors
                            if (!svgData || svgData.length < 10) {
                                logMessage('Error: SVG serialization failed', 'error');
                                throw new Error('SVG serialization failed');
                            }
                            
                            try {
                                const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));
                                const svgUrl = 'data:image/svg+xml;base64,' + svgBase64;
                                
                                logMessage('SVG encoded successfully, creating image...', 'info');
                                
                                const img = new Image();
                                
                                img.onload = function() {
                                    try {
                                        // Fill white background
                                        ctx.fillStyle = 'white';
                                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                                        
                                        // Draw SVG with effective scale
                                        ctx.scale(effectiveScale, effectiveScale);
                                        ctx.drawImage(img, 0, 0, svgWidth, svgHeight);
                                        
                                        // Get PNG data
                                        const pngDataUrl = canvas.toDataURL('image/png');
                                        
                                        if (!pngDataUrl || !pngDataUrl.startsWith('data:image/png;base64,')) {
                                            logMessage('Error: Failed to generate valid PNG data URL', 'error');
                                            throw new Error('Invalid PNG data URL');
                                        }
                                        
                                        logMessage('PNG conversion successful', 'success');
                                        
                                        // Restore original transform
                                        svgForPng.style.transform = originalTransform;
                                        
                                        vscode.postMessage({
                                            command: 'pngData',
                                            content: pngDataUrl
                                        });
                                    } catch (drawError) {
                                        logMessage('Error drawing image: ' + drawError.message, 'error');
                                        svgForPng.style.transform = originalTransform;
                                    }
                                };
                                
                                img.onerror = function() {
                                    logMessage('Error loading SVG image', 'error');
                                    svgForPng.style.transform = originalTransform;
                                };
                                
                                img.src = svgUrl;
                            } catch (encodeError) {
                                logMessage('Error encoding SVG: ' + encodeError.message, 'error');
                                svgForPng.style.transform = originalTransform;
                            }
                        } catch (error) {
                            logMessage('PNG conversion error: ' + error.message, 'error');
                        }
                        break;
                        
                    case 'convertToJpg':
                        try {
                            // Convert SVG to JPG
                            const svgForJpg = document.querySelector('.mermaid svg');
                            if (!svgForJpg) {
                                logMessage('Error: SVG element not found for JPG conversion', 'error');
                                return;
                            }

                            logMessage('Starting JPG conversion...', 'info');

                             const canvas = document.getElementById('imageCanvas');
                             const ctx = canvas.getContext('2d');
                            
                            // Store original transform to restore later
                            const originalTransform = svgForJpg.style.transform;
                            
                            // Temporarily reset transform for full capture
                            svgForJpg.style.transform = 'scale(1)';
                            
                            // Get the full SVG dimensions - using the viewBox if available
                            const viewBox = svgForJpg.getAttribute('viewBox');
                            let svgWidth, svgHeight;
                            
                            if (viewBox) {
                                const viewBoxValues = viewBox.split(' ').map(Number);
                                svgWidth = viewBoxValues[2];
                                svgHeight = viewBoxValues[3];
                                logMessage('Using viewBox dimensions: ' + svgWidth + 'x' + svgHeight, 'info');
                            } else {
                                // Fallback to getBoundingClientRect
                                const svgRect = svgForJpg.getBoundingClientRect();
                                svgWidth = svgRect.width;
                                svgHeight = svgRect.height;
                                logMessage('Using getBoundingClientRect dimensions: ' + svgWidth + 'x' + svgHeight, 'info');
                            }
                            
                            // Calculate scale based on complexity - more nodes = higher scale
                            const nodes = svgForJpg.querySelectorAll('.node').length;
                            const textElements = svgForJpg.querySelectorAll('text').length;
                            
                            // Base scale factor is 3, increase if there are many nodes or text elements
                            let scale = 3;
                            if (nodes > 20 || textElements > 50) scale = 4;
                            if (nodes > 50 || textElements > 100) scale = 5;
                            if (nodes > 100 || textElements > 200) scale = 6;
                            
                            logMessage('Using scale factor ' + scale + 'x (' + nodes + ' nodes, ' + textElements + ' text elements)', 'info');
                            
                            // Ensure reasonable canvas dimensions
                            const maxDimension = 16384; // Max canvas size most browsers support
                            
                            // Calculate desired dimensions
                            const desiredWidth = svgWidth * scale;
                            const desiredHeight = svgHeight * scale;
                            
                            // Calculate aspect ratio
                            const aspectRatio = svgWidth / svgHeight;
                            
                            // Determine canvas dimensions based on aspect ratio
                            let canvasWidth, canvasHeight;
                            
                            if (aspectRatio > 1) {
                                // Landscape orientation (wider than tall)
                                canvasWidth = Math.min(desiredWidth, maxDimension);
                                canvasHeight = Math.min(canvasWidth / aspectRatio, maxDimension);
                            } else {
                                // Portrait orientation (taller than wide)
                                canvasHeight = Math.min(desiredHeight, maxDimension);
                                canvasWidth = Math.min(canvasHeight * aspectRatio, maxDimension);
                            }
                            
                            // Set canvas size
                            canvas.width = canvasWidth;
                            canvas.height = canvasHeight;
                            
                            // Calculate effective scale if dimensions were constrained
                            const effectiveWidthScale = canvasWidth / svgWidth;
                            const effectiveHeightScale = canvasHeight / svgHeight;
                            const effectiveScale = Math.min(effectiveWidthScale, effectiveHeightScale);
                            
                            logMessage('Canvas dimensions: ' + canvasWidth + 'x' + canvasHeight + ', effective scale: ' + effectiveScale, 'info');
                            
                            // Create SVG data URL
                            const svgData = new XMLSerializer().serializeToString(svgForJpg);
                            
                            // Handle potential DOM parsing errors
                            if (!svgData || svgData.length < 10) {
                                logMessage('Error: SVG serialization failed', 'error');
                                throw new Error('SVG serialization failed');
                            }
                            
                            try {
                                const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));
                                const svgUrl = 'data:image/svg+xml;base64,' + svgBase64;
                                
                                logMessage('SVG encoded successfully, creating image...', 'info');
                                
                                const img = new Image();
                                
                                img.onload = function() {
                                    try {
                                        // Fill white background
                                        ctx.fillStyle = 'white';
                                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                                        
                                        // Draw SVG with effective scale
                                        ctx.scale(effectiveScale, effectiveScale);
                                        ctx.drawImage(img, 0, 0, svgWidth, svgHeight);
                                        
                                        // Get JPG data
                                        const jpgDataUrl = canvas.toDataURL('image/jpeg', 0.95);
                                        
                                        if (!jpgDataUrl || !jpgDataUrl.startsWith('data:image/jpeg;base64,')) {
                                            logMessage('Error: Failed to generate valid JPG data URL', 'error');
                                            throw new Error('Invalid JPG data URL');
                                        }
                                        
                                        logMessage('JPG conversion successful', 'success');
                                        
                                        // Restore original transform
                                        svgForJpg.style.transform = originalTransform;
                                        
                                        vscode.postMessage({
                                            command: 'jpgData',
                                            content: jpgDataUrl
                                        });
                                    } catch (drawError) {
                                        logMessage('Error drawing image: ' + drawError.message, 'error');
                                        svgForJpg.style.transform = originalTransform;
                                    }
                                };
                                
                                img.onerror = function() {
                                    logMessage('Error loading SVG image', 'error');
                                    svgForJpg.style.transform = originalTransform;
                                };
                                
                                img.src = svgUrl;
                            } catch (encodeError) {
                                logMessage('Error encoding SVG: ' + encodeError.message, 'error');
                                svgForJpg.style.transform = originalTransform;
                            }
                        } catch (error) {
                            logMessage('JPG conversion error: ' + error.message, 'error');
                        }
                        break;
                }
            });
        </script>
    </body>
    </html>`;
}

// generateErrorHtml remains useful for displaying initialization errors
export function generateErrorHtml(message: string, mermaidScriptUri?: string): string {
    // Use error styles from "Copy"
    const escapedMessage = message.replace(/</g, "<").replace(/>/g, ">");
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TON Graph - Error</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                line-height: 1.6;
                padding: 20px;
                background-color: #f5f5f5; /* Background from copy */
            }
            .container {
                max-width: 800px;
                margin: auto;
                background: white; /* Background from copy */
                padding: 20px;
                border-radius: 5px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            h1 {
                 color: #d32f2f; /* Error title color */
                 margin-top: 0;
            }
            .error {
                 /* Error box style from copy */
                color: #721c24;
                background-color: #f8d7da;
                padding: 15px;
                border-radius: 5px;
                border: 1px solid #f5c6cb; /* Added border for definition */
                white-space: pre-wrap;
                word-wrap: break-word;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Error Occurred</h1>
            <div class="error">${escapedMessage}</div>
             ${mermaidScriptUri ? '<!-- Mermaid script was available but not used on error page -->' : ''}
        </div>
    </body>
    </html>
`;
}

// Helper function to determine if a node should be hidden
function shouldHideNode(
    nodeId: string,
    hiddenNodes: Set<string>,
    nameFilter: string | undefined,
    matchingNodes: Set<string>,
    connectedNodes: Set<string>
): boolean {
    // If type filtering is hiding this node
    if (hiddenNodes.has(nodeId)) return true;

    // If no name filter, keep the node
    if (!nameFilter || nameFilter.length === 0) return false;

    // If name filter is active, only show matching and connected nodes
    return !matchingNodes.has(nodeId) && !connectedNodes.has(nodeId);
}

// Helper function to get node type from node ID
function getNodeType(nodeId: string): string | null {
    // Extract function type from node ID (format: nodeId_functionType)
    const parts = nodeId.split('_');
    if (parts.length > 1) {
        const type = parts[parts.length - 1];
        // Check if the type is one of our known function types
        if (['impure', 'inline', 'method_id', 'regular'].includes(type)) {
            return type;
        }
    }
    return null;
}

// Helper function to extract node name by removing type suffix
function extractNodeName(nodeId: string): string {
    const parts = nodeId.split('_');
    if (parts.length > 1) {
        const lastPart = parts[parts.length - 1];
        if (['impure', 'inline', 'method_id', 'regular'].includes(lastPart)) {
            // Remove the type suffix
            return parts.slice(0, -1).join('_');
        }
    }
    return nodeId;
}

// Helper function to remove HTML entities from diagram code for better parsing
function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&#95;/g, '_')
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&');
}

// Function to filter the Mermaid diagram based on selected types
export function filterMermaidDiagram(diagram: string, selectedTypes: string[], nameFilter?: string): string {
    // Log parameters for debugging
    logger.info(`filterMermaidDiagram called with types: ${selectedTypes.join(', ')}`);
    logger.info(`nameFilter: ${nameFilter}`);

    // Extra guard for undefined parameters
    if (!selectedTypes || selectedTypes.length === 0) {
        logger.error("selectedTypes is empty or undefined, using default");
        selectedTypes = ['impure', 'inline', 'method_id', 'regular'];
    }

    if (!diagram) {
        logger.error("diagram is empty or undefined");
        return diagram || "";
    }

    try {
        // Split the graph into lines and decode HTML entities
        const lines = diagram.split('\\n').map(line => decodeHtmlEntities(line));

        // Make a clean copy of the original lines for reference
        const originalLines = [...lines];

        // Find the original graph definition line
        const graphDefLineIndex = lines.findIndex(line =>
            line.trim().startsWith('graph ') || line.trim().startsWith('flowchart ')
        );

        if (graphDefLineIndex === -1) {
            logger.error("Could not find graph definition directive");
            return diagram;
        }

        const graphDefinition = lines[graphDefLineIndex];
        logger.info(`Found graph definition: ${graphDefinition} `);

        // If no name filter, just filter by type (simple filtering)
        if (!nameFilter || nameFilter.trim().length === 0) {
            const filteredLines = [];

            // Always start with the graph definition
            filteredLines.push(graphDefinition);

            // Add all lines except the graph definition and hidden nodes
            for (let i = 0; i < lines.length; i++) {
                // Skip the original graph definition line
                if (i === graphDefLineIndex) continue;

                const line = lines[i];
                const trimmedLine = line.trim();

                // Skip any additional graph definition lines 
                if (trimmedLine.startsWith('graph ') || trimmedLine.startsWith('flowchart ')) {
                    // Removing this console.log: 
                    // logger.info(`Skipping duplicate graph definition at line ${ i }: ${ trimmedLine } `);
                    continue;
                }

                // Keep structural, classes, and edge lines
                if (line.includes('subgraph ') ||
                    line.includes('classDef ') ||
                    line.includes('class ') ||
                    line.includes('end') ||
                    line.includes('-->')) {
                    filteredLines.push(line);
                    continue;
                }

                // Filter node lines based on type
                if (line.includes('[') && line.includes(']')) {
                    const nodeId = line.split('[')[0].trim();
                    const nodeType = getNodeType(nodeId);
                    if (nodeType && !selectedTypes.includes(nodeType)) {
                        continue; // Skip this node
                    }
                    filteredLines.push(line);
                    continue;
                }

                // Keep all other lines
                filteredLines.push(line);
            }

            const result = filteredLines.join('\\n');
            return validateAndFixDiagram(result);
        }

        //=== Name filtering - collecting information ===//
        const hiddenNodes = new Set<string>();
        const visibleNodes = new Set<string>();
        const nodeLabels = new Map<string, string>(); // Map node IDs to their display labels
        const edgeConnections = new Map<string, Set<string>>(); // Map of node ID to connected nodes
        const allNodeIds = new Map<string, string>(); // Map node ID without type suffix to full node ID
        const clusterNodes = new Map<string, Set<string>>(); // Map cluster ID to node IDs in that cluster
        const nodeToCluster = new Map<string, string>(); // Map node ID to its cluster ID

        // Helper to get node ID without type suffix
        const getBaseNodeId = (fullNodeId: string): string => {
            const parts = fullNodeId.split('_');
            if (['impure', 'inline', 'method_id', 'regular'].includes(parts[parts.length - 1])) {
                return parts.slice(0, -1).join('_');
            }
            return fullNodeId;
        };

        // First pass: collect nodes, labels, clusters, and edges
        let currentCluster = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Skip the original graph definition, we'll handle it separately
            if (i === graphDefLineIndex) continue;

            const trimmedLine = line.trim();

            // Skip any duplicate graph definition lines
            if (trimmedLine.startsWith('graph ') || trimmedLine.startsWith('flowchart ')) {
                logger.info(`Skipping duplicate graph definition at line ${i}: ${trimmedLine} `);
                continue;
            }

            // Track cluster starts
            if (trimmedLine.startsWith('subgraph ')) {
                currentCluster = trimmedLine.split('subgraph ')[1].split('[')[0].trim();
                if (!clusterNodes.has(currentCluster)) {
                    clusterNodes.set(currentCluster, new Set<string>());
                }
                continue;
            }

            // Track cluster ends
            if (trimmedLine === 'end') {
                currentCluster = '';
                continue;
            }

            // Collect node definitions and their labels
            if (line.includes('[') && line.includes(']')) {
                // Extract node ID from the line (text before the bracket)
                let nodeId = '';
                // Handle different formats (with spaces or without)
                const match = line.match(/([^\s\[]+)(\s*)\[/);
                if (match && match[1]) {
                    nodeId = match[1].trim();
                } else {
                    // Fallback to simple split
                    nodeId = line.split('[')[0].trim();
                }

                if (!nodeId) {
                    logger.info(`Could not extract node ID from line: ${line} `);
                    continue;
                }

                // Store the full node ID
                const baseNodeId = getBaseNodeId(nodeId);
                allNodeIds.set(baseNodeId, nodeId);

                // Add node to current cluster
                if (currentCluster) {
                    clusterNodes.get(currentCluster)?.add(nodeId);
                    nodeToCluster.set(nodeId, currentCluster);
                }

                // Extract node label from the line
                const labelMatch = line.match(/\[(.*?)\]/);
                const nodeLabel = labelMatch ? labelMatch[1] : nodeId;
                nodeLabels.set(nodeId, nodeLabel);

                logger.info(`Node: ID = ${nodeId}, BaseID = ${baseNodeId}, Label = ${nodeLabel}, Cluster = ${currentCluster} `);

                // Check if node should be hidden based on type
                const nodeType = getNodeType(nodeId);
                if (nodeType && !selectedTypes.includes(nodeType)) {
                    hiddenNodes.add(nodeId);
                    logger.info(`Hiding node by type: ${nodeId} (${nodeType})`);
                }
            }

            // Collect edge definitions
            if (line.includes('-->')) {
                let from = '', to = '';

                // Parse different edge formats
                if (line.includes('-->|')) {
                    // Format: node1 -->|label| node2
                    const parts = line.split('-->|');
                    if (parts.length >= 2) {
                        from = parts[0].trim();
                        const labelAndTarget = parts[1].split('|');
                        if (labelAndTarget.length >= 2) {
                            to = labelAndTarget[1].trim();
                        }
                    }
                } else {
                    // Simple format: node1 --> node2
                    const parts = line.split('-->');
                    if (parts.length >= 2) {
                        from = parts[0].trim();
                        to = parts[1].trim();
                    }
                }

                // Add edge to our connection graph
                if (from && to) {
                    if (!edgeConnections.has(from)) {
                        edgeConnections.set(from, new Set<string>());
                    }
                    edgeConnections.get(from)?.add(to);

                    if (!edgeConnections.has(to)) {
                        edgeConnections.set(to, new Set<string>());
                    }
                    edgeConnections.get(to)?.add(from);

                    logger.info(`Edge: ${from} <--> ${to} `);
                }
            }
        }

        //=== Find matching nodes based on name filter ===//
        const lowerFilter = nameFilter.toLowerCase();
        const directMatches = new Set<string>();

        // First check for matches by label
        logger.info("Searching for matches by label...");
        for (const [nodeId, nodeLabel] of nodeLabels.entries()) {
            // Skip nodes already hidden by type filter
            if (hiddenNodes.has(nodeId)) continue;

            // Check if the display label contains the search string
            if (nodeLabel.toLowerCase().includes(lowerFilter)) {
                directMatches.add(nodeId);
                visibleNodes.add(nodeId);
                logger.info(`Node label matched filter: ${nodeLabel} (ID: ${nodeId})`);
            }
        }

        // If no label matches, try matching by node ID as fallback
        if (directMatches.size === 0) {
            logger.info("No label matches found, trying node ID fallback");
            for (const [baseNodeId, fullNodeId] of allNodeIds.entries()) {
                if (hiddenNodes.has(fullNodeId)) continue;

                if (baseNodeId.toLowerCase().includes(lowerFilter)) {
                    directMatches.add(fullNodeId);
                    visibleNodes.add(fullNodeId);
                    logger.info(`Node ID matched filter: ${fullNodeId} (Base: ${baseNodeId})`);
                }
            }
        }

        logger.info(`Found ${directMatches.size} directly matching nodes: ${Array.from(directMatches).join(', ')} `);

        //=== Add directly connected nodes ===//
        logger.info("Adding direct neighbors...");
        for (const matchingNodeId of directMatches) {
            logger.info(`Finding neighbors for: ${matchingNodeId} `);

            // Get all connected nodes for this match
            const connectedIds = edgeConnections.get(matchingNodeId) || new Set<string>();
            logger.info(`Found ${connectedIds.size} connections for ${matchingNodeId}`);

            // Add each connected node if not hidden by type
            for (const connectedId of connectedIds) {
                if (!hiddenNodes.has(connectedId)) {
                    logger.info(`Adding connected node: ${connectedId} -> ${nodeLabels.get(connectedId) || connectedId} `);
                    visibleNodes.add(connectedId);
                } else {
                    logger.info(`Skip connected node(hidden by type): ${connectedId} `);
                }
            }
        }

        logger.info(`After adding connections, total visible: ${visibleNodes.size} `);

        //=== Rebuild the diagram ===//
        // Start fresh with only the graph definition
        const newDiagram = [];
        newDiagram.push(graphDefinition);

        // Find all cluster definition lines
        const clusterDefinitions = new Map<string, string>();
        const originalNodeLines = new Map<string, string>();

        for (let i = 0; i < originalLines.length; i++) {
            const line = originalLines[i];
            const trimmedLine = line.trim();

            // Skip graph definitions
            if (trimmedLine.startsWith('graph ') || trimmedLine.startsWith('flowchart ')) {
                continue;
            }

            // Collect cluster definitions
            if (trimmedLine.startsWith('subgraph ')) {
                const clusterId = trimmedLine.split('subgraph ')[1].split('[')[0].trim();
                clusterDefinitions.set(clusterId, line);
            }

            // Collect node definitions
            if (line.includes('[') && line.includes(']')) {
                // Extract node ID
                let nodeId = '';
                const match = line.match(/([^\s\[]+)(\s*)\[/);
                if (match && match[1]) {
                    nodeId = match[1].trim();
                } else {
                    nodeId = line.split('[')[0].trim();
                }

                if (nodeId) {
                    originalNodeLines.set(nodeId, line);
                }
            }
        }

        // Add clusters with visible nodes
        const processedClusters = new Set<string>();

        for (const [clusterId, nodeSet] of clusterNodes.entries()) {
            const visibleNodesInCluster = Array.from(nodeSet).filter(nodeId =>
                visibleNodes.has(nodeId)
            );

            if (visibleNodesInCluster.length > 0) {
                const clusterDefLine = clusterDefinitions.get(clusterId);

                if (clusterDefLine) {
                    // Add the cluster start
                    newDiagram.push(clusterDefLine);
                    processedClusters.add(clusterId);

                    // Add visible nodes in this cluster
                    for (const nodeId of visibleNodesInCluster) {
                        const nodeLine = originalNodeLines.get(nodeId);
                        if (nodeLine) {
                            newDiagram.push(nodeLine);
                        } else {
                            logger.info(`Warning: Could not find definition for node: ${nodeId} `);
                        }
                    }

                    // Close the cluster
                    newDiagram.push('end');
                }
            }
        }

        // Add nodes not in clusters (or in skipped clusters)
        const remainingNodes = Array.from(visibleNodes).filter(nodeId =>
            !nodeToCluster.has(nodeId) || !processedClusters.has(nodeToCluster.get(nodeId) || '')
        );

        for (const nodeId of remainingNodes) {
            const nodeLine = originalNodeLines.get(nodeId);
            if (nodeLine) {
                newDiagram.push(nodeLine);
            }
        }

        // Add edges where both nodes are visible
        const addedEdges = new Set<string>();

        for (const line of originalLines) {
            if (line.includes('-->')) {
                let from = '', to = '';

                // Parse edge format
                if (line.includes('-->|')) {
                    const parts = line.split('-->|');
                    if (parts.length >= 2) {
                        from = parts[0].trim();
                        const labelAndTarget = parts[1].split('|');
                        if (labelAndTarget.length >= 2) {
                            to = labelAndTarget[1].trim();
                        }
                    }
                } else if (line.includes('-->')) {
                    const parts = line.split('-->');
                    if (parts.length >= 2) {
                        from = parts[0].trim();
                        to = parts[1].trim();
                    }
                }

                // Only include edges between visible nodes
                if (from && to && visibleNodes.has(from) && visibleNodes.has(to)) {
                    const edgeKey = `${from} --> ${to} `;
                    if (!addedEdges.has(edgeKey)) {
                        newDiagram.push(line);
                        addedEdges.add(edgeKey);
                    }
                }
            }
        }

        // Add class definitions and assignments
        const classDefLines = [];
        const classAssignLines = [];

        for (const line of originalLines) {
            if (line.includes('classDef ')) {
                classDefLines.push(line);
            } else if (line.startsWith('class ')) {
                const parts = line.split(' ');
                if (parts.length >= 2) {
                    const nodeId = parts[1];
                    if (visibleNodes.has(nodeId)) {
                        classAssignLines.push(line);
                    }
                }
            }
        }

        // Add all class definitions and assignments
        newDiagram.push(...classDefLines);
        newDiagram.push(...classAssignLines);

        // Join and validate the final diagram
        const result = newDiagram.join('\\n');
        // Removing this console.log:
        // logger.info(`Reconstructed diagram with ${ newDiagram.length } lines`);

        return validateAndFixDiagram(result);
    }
    catch (error) {
        logger.error("Error in filterMermaidDiagram:", error);
        return diagram; // Return original on error
    }
}

// Helper function to validate and fix Mermaid diagram syntax
function validateAndFixDiagram(diagramCode: string): string {
    try {
        const lines = diagramCode.split('\\n');
        const cleanedLines = [];
        let graphDirectiveFound = false;
        let inSubgraph = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Handle graph directive - ensure it's only included once at the beginning
            if (line.startsWith('graph ') || line.startsWith('flowchart ')) {
                if (!graphDirectiveFound) {
                    cleanedLines.push(lines[i]); // Keep original whitespace
                    graphDirectiveFound = true;
                } else {
                    logger.info(`Removing duplicate graph directive at line ${i + 1}: ${line} `);
                }
                continue;
            }

            // Track subgraph state
            if (line.startsWith('subgraph ')) {
                inSubgraph = true;
            } else if (line === 'end') {
                inSubgraph = false;
            }

            // If we find another graph directive inside a subgraph, that's the problem
            // We'll remove it while keeping the rest of the line
            if (inSubgraph && line.includes('graph ')) {
                const fixedLine = lines[i].replace(/graph\s+(TB|LR|RL|BT|TD);?/g, '').trim();
                if (fixedLine) {
                    cleanedLines.push(fixedLine);
                    logger.info(`Fixed problematic line ${i + 1}: Removed graph directive from "${line}" -> "${fixedLine}"`);
                }
            } else {
                cleanedLines.push(lines[i]); // Keep original line with whitespace
            }
        }

        // Ensure we have a graph directive
        if (!graphDirectiveFound) {
            cleanedLines.unshift('graph TB;');
            logger.info('Added missing graph directive');
        }

        return cleanedLines.join('\\n');
    } catch (error) {
        logger.error("Error in validateAndFixDiagram:", error);
        return diagramCode; // Return original on validation error
    }
}
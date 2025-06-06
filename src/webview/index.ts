/* eslint-disable */
// @ts-nocheck
import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polygon', 'polyline',
  'text', 'defs', 'marker', 'style', 'filter', 'linearGradient', 'stop', 'title',
  'foreignObject', 'image'
];
const ALLOWED_ATTR = [
  'class', 'style', 'x', 'y', 'width', 'height', 'viewBox', 'fill', 'stroke', 'd',
  'points', 'rx', 'ry', 'cx', 'cy', 'r', 'x1', 'x2', 'y1', 'y2', 'xmlns',
  'transform', 'id', 'font-size', 'text-anchor', 'dominant-baseline',
  'preserveAspectRatio', 'offset', 'stop-color'
];
declare const filterSet: { value: string; label: string; }[];
declare const mermaidTheme: string;
let currentZoom = 1;
const zoomStep = 0.05;
let selectedFilters = [];
function initializeFilters() {
const typeFiltersContainer = document.getElementById('typeFilters');
while (typeFiltersContainer.firstChild) {
  typeFiltersContainer.removeChild(typeFiltersContainer.firstChild);
}
filterSet.forEach(function(filter) {
const filterDiv = document.createElement('div');
filterDiv.className = 'filter-option';
const checkbox = document.createElement('input');
checkbox.type = 'checkbox';
checkbox.id = 'filter-' + filter.value;
checkbox.value = filter.value;
checkbox.checked = true;
const label = document.createElement('label');
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
const checkboxes = document.querySelectorAll('#typeFilters input[type="checkbox"]');
selectedFilters = Array.from(checkboxes)
.filter(function(cb) { return cb.checked; })
.map(function(cb) { return cb.value; });
applyFilters();
}
function applyFilters() {
const nameFilter = document.getElementById('nameFilter').value.trim();
vscode.postMessage({
command: 'applyFilters',
selectedTypes: selectedFilters,
nameFilter: nameFilter
});
logMessage('Applying filters...', 'info');
}
mermaid.initialize({
startOnLoad: false,
securityLevel: 'strict',
theme: mermaidTheme || 'default',
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
const sanitizedSvg = DOMPurify.sanitize(result.svg, {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  SAFE_FOR_TEMPLATES: true
});
const diagramContainer = document.getElementById('mermaid-diagram');
diagramContainer.innerHTML = sanitizedSvg;
secureLinks(diagramContainer);
setupPanZoom();
logMessage('Diagram rendered successfully', 'success');
document.getElementById('loadingOverlay').classList.add('hidden');
}).catch(function(error) {
document.getElementById('errorContainer').textContent = 'Error rendering diagram: ' + error;
document.getElementById('errorContainer').style.display = 'block';
logMessage('Error rendering diagram: ' + error, 'error');
document.getElementById('loadingOverlay').classList.add('hidden');
});
var vscode = acquireVsCodeApi();
window.addEventListener('message', function(event) {
  const message = event.data;
  if (!message || typeof message !== 'object' || typeof message.command !== 'string') {
    return;
  }
  switch (message.command) {
  case 'updateDiagram':
    if (typeof message.diagram !== 'string') return;
    const mermaidDiagram = document.getElementById('mermaid-diagram');
    mermaidDiagram.textContent = message.diagram;
    mermaidDiagram.setAttribute('data-original-code', message.diagram);
    const fontSize = 14;
    const nodeSpacing = 15;
    const rankSpacing = 15;
    mermaid.initialize({
      startOnLoad: false,
securityLevel: 'strict',
theme: mermaidTheme || 'default',
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
const sanitizedUpdateSvg = DOMPurify.sanitize(result.svg, {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  SAFE_FOR_TEMPLATES: true
});
mermaidDiagram.innerHTML = sanitizedUpdateSvg;
secureLinks(mermaidDiagram);
setupPanZoom();
logMessage('Diagram updated with filters', 'success');
}).catch(function(error) {
document.getElementById('errorContainer').textContent = 'Error updating diagram: ' + error;
document.getElementById('errorContainer').style.display = 'block';
logMessage('Error updating diagram: ' + error, 'error');
    });
    break;
  case 'filterError':
    if (typeof message.error !== 'string') return;
    document.getElementById('errorContainer').textContent = message.error;
    document.getElementById('errorContainer').style.display = 'block';
    logMessage('Filter error: ' + message.error, 'error');
    break;
  }
});
function logMessage(message, type) {
const logContainer = document.getElementById('logContainer');
const logEntry = document.createElement('div');
logEntry.className = 'log-entry log-' + type;
logEntry.textContent = message;
logContainer.appendChild(logEntry);
logContainer.scrollTop = logContainer.scrollHeight;
}
function setupPanZoom() {
const svg = document.querySelector('.mermaid svg');
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
const svg = document.querySelector('.mermaid svg');
if (!svg) return;
svg.style.transform = 'scale(' + currentZoom + ')';
svg.style.transformOrigin = '0 0';
svg.style.webkitFontSmoothing = 'antialiased';
svg.style.mozOsxFontSmoothing = 'grayscale';
enhanceSvgQuality(svg);
}
function resetZoom() {
currentZoom = 1;
const svg = document.querySelector('.mermaid svg');
if (svg) {
svg.style.transform = 'scale(1)';
}
const container = document.querySelector('.mermaid-container');
container.scrollLeft = 0;
container.scrollTop = 0;
}
function toggleCodeDisplay() {
const codeDisplay = document.getElementById('codeDisplay');
const mermaidContainer = document.querySelector('.mermaid-container');
const originalMermaidCode = document.getElementById('mermaid-diagram').getAttribute('data-original-code') || '';
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

function secureLinks(container) {
  const anchors = container.querySelectorAll('a');
  anchors.forEach(function(anchor) {
    const href = anchor.getAttribute('href');
    if (href && /^\s*javascript:/i.test(href)) {
      anchor.removeAttribute('href');
    } else if (href) {
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noopener noreferrer');
    }
  });
}


import { buildExportParts, getCombinedBounds } from './exportLayout.js';
import { createShaftOutlinePoints, getShaftSpec } from './shaftProfiles.js';

const expandBounds = (bounds, margin) => {
    if (!bounds) {
        return { minX: -margin, maxX: margin, minY: -margin, maxY: margin };
    }
    return {
        minX: bounds.minX - margin,
        maxX: bounds.maxX + margin,
        minY: bounds.minY - margin,
        maxY: bounds.maxY + margin
    };
};

export const generateSVG = (gear1, gear2, gear1Config, gear2Config, centerDistance, exportOptions = {}) => {
    const parts = buildExportParts(gear1, gear2, gear1Config, gear2Config, centerDistance, exportOptions);
    const combinedBounds = expandBounds(getCombinedBounds(parts), 5);

    const width = combinedBounds.maxX - combinedBounds.minX;
    const height = combinedBounds.maxY - combinedBounds.minY;
    const safeWidth = width || 10;
    const safeHeight = height || 10;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${combinedBounds.minX} ${combinedBounds.minY} ${safeWidth} ${safeHeight}" width="${safeWidth}mm" height="${safeHeight}mm">`;
    svg += `<style>path { fill: none; stroke: black; stroke-width: 0.1; }</style>`;

    // Helper to create path from points
    const createGearPath = (points, offsetX, offsetY) => {
        if (points.length === 0) return "";
        let d = `M ${points[0].x + offsetX} ${points[0].y + offsetY}`;
        for (let i = 1; i < points.length; i++) {
            d += ` L ${points[i].x + offsetX} ${points[i].y + offsetY}`;
        }
        d += " Z";
        return d;
    };

    // Helper for Circle Hole
    const createCirclePath = (cx, cy, r) => {
        return `M ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} Z`;
    };

    const createShaftPath = (cx, cy, config) => {
        const shaftSpec = getShaftSpec(config);
        if (!shaftSpec) {
            return '';
        }
        if (shaftSpec.kind === 'circle') {
            return createCirclePath(cx, cy, shaftSpec.diameter / 2);
        }
        return createGearPath(createShaftOutlinePoints(shaftSpec, 20), cx, cy);
    };

    parts.forEach(part => {
        svg += `<path d="${createGearPath(part.points, 0, 0)}" />`;
        if (part.includeShaftHole) {
            const shaftPath = createShaftPath(part.origin.x, part.origin.y, part.config);
            if (shaftPath) {
                svg += `<path d="${shaftPath}" />`;
            }
        }
    });

    svg += `</svg>`;
    return svg;
};

export const downloadSVG = (svgContent, filename) => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

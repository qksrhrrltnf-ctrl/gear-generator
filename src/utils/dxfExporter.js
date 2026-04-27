
import { buildExportParts } from './exportLayout.js';
import { createShaftOutlinePoints, getShaftSpec } from './shaftProfiles.js';

export const generateDXF = (gear1, gear2, gear1Config, gear2Config, centerDistance, exportOptions = {}) => {
    let dxf = "";

    // Header
    dxf += "0\nSECTION\n2\nHEADER\n0\nENDSEC\n";

    // Entities Section
    dxf += "0\nSECTION\n2\nENTITIES\n";

    // Helper to draw a polyline
    const addPolyline = (points, offsetX, offsetY) => {
        dxf += "0\nLWPOLYLINE\n";
        dxf += "8\n0\n"; // Layer 0
        dxf += "90\n" + points.length + "\n"; // Number of vertices
        dxf += "70\n1\n"; // Closed flag (1 = closed, 0 = open)

        points.forEach(p => {
            dxf += "10\n" + (p.x + offsetX).toFixed(4) + "\n";
            dxf += "20\n" + (p.y + offsetY).toFixed(4) + "\n";
        });
    };

    // Helper to draw a circle (for the hole)
    const addCircle = (cx, cy, radius) => {
        dxf += "0\nCIRCLE\n";
        dxf += "8\n0\n";
        dxf += "10\n" + cx.toFixed(4) + "\n";
        dxf += "20\n" + cy.toFixed(4) + "\n";
        dxf += "40\n" + radius.toFixed(4) + "\n";
    };

    const addShaftHole = (cx, cy, config) => {
        const shaftSpec = getShaftSpec(config);
        if (!shaftSpec) {
            return;
        }
        if (shaftSpec.kind === 'circle') {
            addCircle(cx, cy, shaftSpec.diameter / 2);
            return;
        }
        addPolyline(createShaftOutlinePoints(shaftSpec, 20), cx, cy);
    };

    const parts = buildExportParts(gear1, gear2, gear1Config, gear2Config, centerDistance, exportOptions);
    parts.forEach(part => {
        addPolyline(part.points, 0, 0);
        if (part.includeShaftHole) {
            addShaftHole(part.origin.x, part.origin.y, part.config);
        }
    });

    // End Entities
    dxf += "0\nENDSEC\n";

    // EOF
    dxf += "0\nEOF\n";

    return dxf;
};

export const downloadDXF = (dxfContent, filename) => {
    const blob = new Blob([dxfContent], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

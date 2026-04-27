import earcut from 'earcut';
import { buildExportParts, translatePoints } from './exportLayout.js';
import { createShaftOutlinePoints, getShaftSpec } from './shaftProfiles.js';

const toFiniteNumber = (value, fallback) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
};

const signedArea = (points) => {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const current = points[i];
        const next = points[(i + 1) % points.length];
        area += current.x * next.y - next.x * current.y;
    }
    return area / 2;
};

const ensureWinding = (points, shouldBeClockwise) => {
    const isClockwise = signedArea(points) < 0;
    return isClockwise === shouldBeClockwise ? points : [...points].reverse();
};

const createCirclePoints = (diameter, segments = 48) => {
    const radius = diameter / 2;
    return Array.from({ length: segments }, (_, i) => {
        const theta = (i / segments) * Math.PI * 2;
        return {
            x: radius * Math.cos(theta),
            y: radius * Math.sin(theta)
        };
    });
};

const getShaftHolePoints = (config) => {
    const spec = getShaftSpec(config);
    if (!spec) {
        return [];
    }
    if (spec.kind === 'circle') {
        return createCirclePoints(spec.diameter);
    }
    return createShaftOutlinePoints(spec, 20);
};

const calculateNormal = (a, b, c) => {
    const ux = b.x - a.x;
    const uy = b.y - a.y;
    const uz = b.z - a.z;
    const vx = c.x - a.x;
    const vy = c.y - a.y;
    const vz = c.z - a.z;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz) || 1;

    return {
        x: nx / length,
        y: ny / length,
        z: nz / length
    };
};

const formatNumber = (value) => Number(value).toFixed(6);

const formatFacet = (a, b, c) => {
    const normal = calculateNormal(a, b, c);
    return [
        `  facet normal ${formatNumber(normal.x)} ${formatNumber(normal.y)} ${formatNumber(normal.z)}`,
        '    outer loop',
        `      vertex ${formatNumber(a.x)} ${formatNumber(a.y)} ${formatNumber(a.z)}`,
        `      vertex ${formatNumber(b.x)} ${formatNumber(b.y)} ${formatNumber(b.z)}`,
        `      vertex ${formatNumber(c.x)} ${formatNumber(c.y)} ${formatNumber(c.z)}`,
        '    endloop',
        '  endfacet'
    ].join('\n');
};

const addOrientedFacet = (facets, a, b, c, expectedZSign = null) => {
    const normal = calculateNormal(a, b, c);
    if (expectedZSign && normal.z * expectedZSign < 0) {
        facets.push(formatFacet(a, c, b));
        return;
    }
    facets.push(formatFacet(a, b, c));
};

const createExtrudedMeshFacets = (outerPoints, holePointGroups, thickness) => {
    const facets = [];
    const safeThickness = Math.max(0.1, toFiniteNumber(thickness, 3));
    const zBottom = 0;
    const zTop = safeThickness;
    const outer = ensureWinding(outerPoints, false);
    const holes = holePointGroups
        .filter(points => points.length >= 3)
        .map(points => ensureWinding(points, true));
    const allLoops = [outer, ...holes];
    const vertices2d = [];
    const holeIndices = [];

    allLoops.forEach((loop, loopIndex) => {
        if (loopIndex > 0) {
            holeIndices.push(vertices2d.length / 2);
        }
        loop.forEach(point => {
            vertices2d.push(point.x, point.y);
        });
    });

    const triangleIndices = earcut(vertices2d, holeIndices, 2);

    for (let i = 0; i < triangleIndices.length; i += 3) {
        const aIndex = triangleIndices[i] * 2;
        const bIndex = triangleIndices[i + 1] * 2;
        const cIndex = triangleIndices[i + 2] * 2;
        const aTop = { x: vertices2d[aIndex], y: vertices2d[aIndex + 1], z: zTop };
        const bTop = { x: vertices2d[bIndex], y: vertices2d[bIndex + 1], z: zTop };
        const cTop = { x: vertices2d[cIndex], y: vertices2d[cIndex + 1], z: zTop };
        const aBottom = { ...aTop, z: zBottom };
        const bBottom = { ...bTop, z: zBottom };
        const cBottom = { ...cTop, z: zBottom };

        addOrientedFacet(facets, aTop, bTop, cTop, 1);
        addOrientedFacet(facets, aBottom, cBottom, bBottom, -1);
    }

    const addWallFacets = (loop) => {
        for (let i = 0; i < loop.length; i++) {
            const current = loop[i];
            const next = loop[(i + 1) % loop.length];
            const bottomCurrent = { x: current.x, y: current.y, z: zBottom };
            const bottomNext = { x: next.x, y: next.y, z: zBottom };
            const topCurrent = { x: current.x, y: current.y, z: zTop };
            const topNext = { x: next.x, y: next.y, z: zTop };

            facets.push(formatFacet(bottomCurrent, bottomNext, topNext));
            facets.push(formatFacet(bottomCurrent, topNext, topCurrent));
        }
    };

    allLoops.forEach(addWallFacets);

    return facets;
};

const createPartFacets = (part, thickness) => {
    const outer = part.points;
    const holes = part.includeShaftHole
        ? [translatePoints(getShaftHolePoints(part.config), part.origin.x, part.origin.y)]
        : [];

    return createExtrudedMeshFacets(outer, holes, thickness);
};

export const generateSTL = (gear1, gear2, gear1Config, gear2Config, centerDistance, thickness = 3, exportOptions = {}) => {
    const parts = buildExportParts(gear1, gear2, gear1Config, gear2Config, centerDistance, exportOptions);
    const facets = parts.flatMap(part => createPartFacets(part, thickness));

    return `solid gears_design\n${facets.join('\n')}\nendsolid gears_design\n`;
};

export const downloadSTL = (stlContent, filename) => {
    const blob = new Blob([stlContent], { type: 'model/stl' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

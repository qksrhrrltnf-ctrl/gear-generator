import { transformRackPointsForMesh } from './gearAlignment.js';

const toFiniteNumber = (value, fallback) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
};

export const getPointBounds = (points) => {
    if (!points || !points.length) {
        return null;
    }

    return points.reduce(
        (bounds, point) => ({
            minX: Math.min(bounds.minX, point.x),
            maxX: Math.max(bounds.maxX, point.x),
            minY: Math.min(bounds.minY, point.y),
            maxY: Math.max(bounds.maxY, point.y)
        }),
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    );
};

export const translatePoints = (points, offsetX, offsetY) => points.map(point => ({
    x: point.x + offsetX,
    y: point.y + offsetY
}));

const normalizeExportOptions = (options = {}) => {
    const includeGear1 = options.includeGear1 !== false;
    const includeGear2 = options.includeGear2 !== false;

    return {
        includeGear1: includeGear1 || !includeGear2,
        includeGear2: includeGear2 || !includeGear1,
        spacing: Math.max(0, toFiniteNumber(options.spacing, 10))
    };
};

export const buildExportParts = (gear1, gear2, gear1Config, gear2Config, centerDistance, options = {}) => {
    const normalizedOptions = normalizeExportOptions(options);
    const sourceParts = [];

    if (normalizedOptions.includeGear1) {
        sourceParts.push({
            id: 'gear1',
            points: gear1.points,
            config: gear1Config,
            includeShaftHole: true
        });
    }

    if (normalizedOptions.includeGear2) {
        const isRack = gear2.params.isRack;
        sourceParts.push({
            id: 'gear2',
            points: isRack
                ? transformRackPointsForMesh(gear2.points, gear1.params, gear2.params, centerDistance)
                : gear2.points,
            config: gear2Config,
            includeShaftHole: !isRack
        });
    }

    let nextMinX = 0;
    return sourceParts.map((part, index) => {
        const bounds = getPointBounds(part.points);
        const centerY = (bounds.minY + bounds.maxY) / 2;
        const offsetX = index === 0 ? -bounds.minX : nextMinX - bounds.minX;
        const offsetY = -centerY;
        const placedPoints = translatePoints(part.points, offsetX, offsetY);
        const placedBounds = getPointBounds(placedPoints);

        nextMinX = placedBounds.maxX + normalizedOptions.spacing + 1e-6;

        return {
            ...part,
            points: placedPoints,
            origin: {
                x: offsetX,
                y: offsetY
            },
            bounds: placedBounds
        };
    });
};

export const getCombinedBounds = (parts) => {
    const boundsList = parts.map(part => part.bounds).filter(Boolean);
    if (!boundsList.length) {
        return { minX: 0, maxX: 10, minY: 0, maxY: 10 };
    }

    return boundsList.reduce(
        (combined, bounds) => ({
            minX: Math.min(combined.minX, bounds.minX),
            maxX: Math.max(combined.maxX, bounds.maxX),
            minY: Math.min(combined.minY, bounds.minY),
            maxY: Math.max(combined.maxY, bounds.maxY)
        }),
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    );
};

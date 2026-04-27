export const SHAFT_TYPES = {
    CUSTOM: 'custom',
    TT: 'tt',
    N20: 'n20'
};

export const SHAFT_PRESETS = [
    { value: SHAFT_TYPES.CUSTOM, label: '사용자 지정 원형 구멍' },
    { value: SHAFT_TYPES.TT, label: 'TT 모터 Double-D 축 (5.5 x 3.7mm)' },
    { value: SHAFT_TYPES.N20, label: 'N20 모터 D축 (3mm)' }
];

const toFiniteNumber = (value, fallback) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
};

export const getShaftSpec = (config = {}) => {
    const shaftType = config.shaftType || (config.isArduinoShaft ? SHAFT_TYPES.TT : SHAFT_TYPES.CUSTOM);
    const hasTolerance = Boolean(config.shaftTolerance ?? config.isArduinoTolerance);

    if (shaftType === SHAFT_TYPES.TT) {
        const tolerance = hasTolerance ? 0.4 : 0;
        return {
            kind: 'doubleD',
            diameter: 5.5 + tolerance,
            flatWidth: 3.7 + tolerance
        };
    }

    if (shaftType === SHAFT_TYPES.N20) {
        const tolerance = hasTolerance ? 0.2 : 0;
        const diameter = 3 + tolerance;
        return {
            kind: 'singleD',
            diameter,
            flatOffset: diameter * 0.3
        };
    }

    const diameter = Math.max(0, toFiniteNumber(config.holeDiameter, 0));
    if (!diameter) {
        return null;
    }

    return {
        kind: 'circle',
        diameter
    };
};

const createArcPoints = (radius, startAngle, endAngle, steps) => {
    const points = [];
    for (let i = 1; i <= steps; i++) {
        const theta = startAngle + (endAngle - startAngle) * (i / steps);
        points.push({
            x: radius * Math.cos(theta),
            y: radius * Math.sin(theta)
        });
    }
    return points;
};

export const createShaftOutlinePoints = (spec, arcSteps = 16) => {
    if (!spec || spec.kind === 'circle') {
        return [];
    }

    const radius = spec.diameter / 2;

    if (spec.kind === 'doubleD') {
        const flatHalfWidth = Math.min(spec.flatWidth / 2, radius * 0.95);
        const arcHeight = Math.sqrt(radius * radius - flatHalfWidth * flatHalfWidth);

        return [
            { x: flatHalfWidth, y: -arcHeight },
            { x: flatHalfWidth, y: arcHeight },
            ...createArcPoints(radius, Math.atan2(arcHeight, flatHalfWidth), Math.atan2(arcHeight, -flatHalfWidth), arcSteps),
            { x: -flatHalfWidth, y: -arcHeight },
            ...createArcPoints(radius, Math.atan2(-arcHeight, -flatHalfWidth), Math.atan2(-arcHeight, flatHalfWidth), arcSteps)
        ];
    }

    const flatOffset = Math.min(spec.flatOffset, radius * 0.95);
    const arcHeight = Math.sqrt(radius * radius - flatOffset * flatOffset);
    const startAngle = Math.atan2(arcHeight, flatOffset);
    const endAngle = Math.atan2(-arcHeight, flatOffset) + Math.PI * 2;

    return [
        { x: flatOffset, y: -arcHeight },
        { x: flatOffset, y: arcHeight },
        ...createArcPoints(radius, startAngle, endAngle, arcSteps * 2)
    ];
};


const toFiniteNumber = (value, fallback) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
};

export const generateGearProfile = (module, teeth, pressureAngleDeg = 20, holeDiameter = 0, shaftType = 'custom', shaftTolerance = false, numPoints = 20) => {
    const safeModule = Math.max(0.1, toFiniteNumber(module, 1));
    const safeTeeth = Math.max(6, Math.round(toFiniteNumber(teeth, 6)));
    const safePressureAngle = Math.min(40, Math.max(5, toFiniteNumber(pressureAngleDeg, 20)));

    const pressureAngle = (safePressureAngle * Math.PI) / 180;
    const pitchDiameter = safeModule * safeTeeth;
    const pitchRadius = pitchDiameter / 2;
    const baseRadius = pitchRadius * Math.cos(pressureAngle);
    const addendum = safeModule;
    const dedendum = 1.25 * safeModule;
    const outerRadius = pitchRadius + addendum;
    const rootRadius = pitchRadius - dedendum;

    const points = [];
    const inv = (a) => Math.tan(a) - a;
    const halfToothAngle = Math.PI / (2 * safeTeeth) + inv(pressureAngle);

    for (let i = 0; i < safeTeeth; i++) {
        const angleOffset = (i * 2 * Math.PI) / safeTeeth;

        // Calculate flank points
        const startRadius = Math.max(baseRadius, rootRadius);
        const maxT = Math.sqrt(Math.pow(outerRadius / baseRadius, 2) - 1);
        const startT = Math.sqrt(Math.pow(startRadius / baseRadius, 2) - 1);

        const flankPoints = [];
        for (let j = 0; j <= numPoints; j++) {
            const t = startT + (maxT - startT) * (j / numPoints);
            const r = baseRadius * Math.sqrt(1 + t * t);
            const ang = inv(Math.acos(baseRadius / r));
            flankPoints.push({ r, ang });
        }

        // 1. Right Flank (Bottom side): From Root/Base to Outer
        // Theta = angleOffset - halfToothAngle + ang

        // If root < base, start from root
        if (rootRadius < baseRadius) {
            points.push({
                x: rootRadius * Math.cos(angleOffset - halfToothAngle),
                y: rootRadius * Math.sin(angleOffset - halfToothAngle)
            });
            points.push({
                x: baseRadius * Math.cos(angleOffset - halfToothAngle),
                y: baseRadius * Math.sin(angleOffset - halfToothAngle)
            });
        }

        for (let j = 0; j <= numPoints; j++) {
            const { r, ang } = flankPoints[j];
            const theta = angleOffset - halfToothAngle + ang;
            points.push({ x: r * Math.cos(theta), y: r * Math.sin(theta) });
        }

        // 2. Left Flank (Top side): From Outer to Root/Base
        // Theta = angleOffset + halfToothAngle - ang
        for (let j = numPoints; j >= 0; j--) {
            const { r, ang } = flankPoints[j];
            const theta = angleOffset + halfToothAngle - ang;
            points.push({ x: r * Math.cos(theta), y: r * Math.sin(theta) });
        }

        // If root < base, go to root
        if (rootRadius < baseRadius) {
            points.push({
                x: baseRadius * Math.cos(angleOffset + halfToothAngle),
                y: baseRadius * Math.sin(angleOffset + halfToothAngle)
            });
            points.push({
                x: rootRadius * Math.cos(angleOffset + halfToothAngle),
                y: rootRadius * Math.sin(angleOffset + halfToothAngle)
            });
        }

        // 3. Root Land (Gap to next tooth)
        const nextAngleOffset = ((i + 1) * 2 * Math.PI) / safeTeeth;

        // Calculate angle shift if root > base
        let angleShiftAtRoot = 0;
        if (rootRadius > baseRadius) {
            angleShiftAtRoot = inv(Math.acos(baseRadius / rootRadius));
        }

        const currentRootAngle = angleOffset + halfToothAngle - angleShiftAtRoot;
        const nextRootAngle = nextAngleOffset - halfToothAngle + angleShiftAtRoot;

        const rootSteps = 5;
        for (let k = 1; k <= rootSteps; k++) {
            const theta = currentRootAngle + (nextRootAngle - currentRootAngle) * (k / (rootSteps + 1));
            points.push({ x: rootRadius * Math.cos(theta), y: rootRadius * Math.sin(theta) });
        }
    }

    return {
        points,
        params: {
            module: safeModule,
            teeth: safeTeeth,
            pressureAngleDeg: safePressureAngle,
            pitchDiameter,
            outerRadius,
            rootRadius,
            holeDiameter,
            shaftType,
            shaftTolerance
        }
    };
};

export const generateRackProfile = (module, teeth, pressureAngleDeg = 20) => {
    const safeModule = Math.max(0.1, toFiniteNumber(module, 1));
    const safeLengthInTeeth = Math.max(4, Math.round(toFiniteNumber(teeth, 10)));
    const safePressureAngle = Math.min(40, Math.max(5, toFiniteNumber(pressureAngleDeg, 20)));

    const pressureAngle = (safePressureAngle * Math.PI) / 180;
    const pitch = Math.PI * safeModule;
    const toothThickness = pitch / 2;
    const addendum = safeModule;
    const dedendum = 1.25 * safeModule;
    const bodyHeight = safeModule * 5; // Height of the solid part below teeth

    const points = [];
    const tanAlpha = Math.tan(pressureAngle);

    // Generate points for each tooth
    // We'll center the rack at x=0 roughly
    const totalLength = safeLengthInTeeth * pitch;
    const startX = -totalLength / 2;

    for (let i = 0; i < safeLengthInTeeth; i++) {
        const toothCenterX = startX + (i + 0.5) * pitch;

        // Coordinates relative to tooth center
        // Top (Addendum)
        const yTop = addendum;
        const xTopLeft = toothCenterX - toothThickness / 2 + addendum * tanAlpha;
        const xTopRight = toothCenterX + toothThickness / 2 - addendum * tanAlpha;

        // Bottom (Dedendum)
        const yBot = -dedendum;
        const xBotLeft = toothCenterX - toothThickness / 2 - dedendum * tanAlpha;
        const xBotRight = toothCenterX + toothThickness / 2 + dedendum * tanAlpha;

        // Previous space (right side of previous tooth or start)
        if (i === 0) {
            // Start point at bottom left (at dedendum level)
            points.push({ x: startX, y: -dedendum });
        }

        // Left root
        points.push({ x: xBotLeft, y: yBot });
        // Top left
        points.push({ x: xTopLeft, y: yTop });
        // Top right
        points.push({ x: xTopRight, y: yTop });
        // Right root
        points.push({ x: xBotRight, y: yBot });
    }

    // End point at dedendum level
    points.push({ x: startX + totalLength, y: -dedendum });

    // Close the shape with a body
    // Bottom Right
    points.push({ x: startX + totalLength, y: -dedendum - bodyHeight });
    // Bottom Left
    points.push({ x: startX, y: -dedendum - bodyHeight });
    // Close to start
    points.push({ x: startX, y: -dedendum });

    return {
        points,
        params: {
            module: safeModule,
            teeth: safeLengthInTeeth, // represents length in teeth
            pressureAngleDeg: safePressureAngle,
            totalLength,
            addendum,
            dedendum,
            bodyHeight,
            isRack: true
        }
    };
};

export const SIZING_MODES = {
    MODULE: 'module',
    GEAR1_OUTER_DIAMETER: 'gear1OuterDiameter',
    GEAR2_OUTER_DIAMETER: 'gear2OuterDiameter'
};

export const SIZING_MODE_OPTIONS = [
    { value: SIZING_MODES.MODULE, label: '모듈 기준' },
    { value: SIZING_MODES.GEAR1_OUTER_DIAMETER, label: '기어 1 외경 기준' },
    { value: SIZING_MODES.GEAR2_OUTER_DIAMETER, label: '기어 2 외경 기준' }
];

const toFiniteNumber = (value, fallback) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
};

const clampModule = (module) => Math.min(20, Math.max(0.1, module));

export const calculateOuterDiameter = (module, teeth) => {
    const safeModule = clampModule(toFiniteNumber(module, 1));
    const safeTeeth = Math.max(6, Math.round(toFiniteNumber(teeth, 6)));
    return safeModule * (safeTeeth + 2);
};

export const calculateModuleFromOuterDiameter = (outerDiameter, teeth) => {
    const safeOuterDiameter = Math.max(1, toFiniteNumber(outerDiameter, 1));
    const safeTeeth = Math.max(6, Math.round(toFiniteNumber(teeth, 6)));
    return clampModule(safeOuterDiameter / (safeTeeth + 2));
};

export const resolveEffectiveModule = (config) => {
    if (!config) {
        return 1;
    }

    if (config.sizingMode === SIZING_MODES.GEAR1_OUTER_DIAMETER) {
        return calculateModuleFromOuterDiameter(config.targetOuterDiameter, config.gear1?.teeth);
    }

    if (config.gearType !== 'rack' && config.sizingMode === SIZING_MODES.GEAR2_OUTER_DIAMETER) {
        return calculateModuleFromOuterDiameter(config.targetOuterDiameter, config.gear2?.teeth);
    }

    return clampModule(toFiniteNumber(config.module, 1));
};

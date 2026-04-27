export const calculateRackMeshOffset = (gear1Params, rackParams) => {
    if (!gear1Params || !rackParams || !rackParams.isRack) {
        return 0;
    }

    const module = Number(gear1Params.module) || 0;
    const pitch = Math.PI * module;

    if (!pitch) {
        return 0;
    }

    const pinionPhase = ((gear1Params.teeth || 0) / 4) % 1;
    const rackPhase = ((rackParams.teeth || 0) / 2 + 0.5) % 1;
    const delta = (pinionPhase + 0.5) - rackPhase;

    return delta * pitch;
};

export const transformRackPointsForMesh = (points, gear1Params, rackParams, centerDistance) => {
    const meshOffset = calculateRackMeshOffset(gear1Params, rackParams);
    const rackY = Number(centerDistance) || 0;

    return points.map(point => ({
        x: -point.x + meshOffset,
        y: -point.y + rackY
    }));
};

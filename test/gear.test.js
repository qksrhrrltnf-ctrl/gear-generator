import assert from 'node:assert/strict';
import test from 'node:test';

import { generateGearProfile, generateRackProfile } from '../src/utils/gearMath.js';
import { calculateModuleFromOuterDiameter, calculateOuterDiameter, resolveEffectiveModule } from '../src/utils/gearSizing.js';
import { transformRackPointsForMesh } from '../src/utils/gearAlignment.js';
import { buildExportParts } from '../src/utils/exportLayout.js';
import { createShaftOutlinePoints, getShaftSpec } from '../src/utils/shaftProfiles.js';
import { generateSVG } from '../src/utils/svgExporter.js';
import { generateDXF } from '../src/utils/dxfExporter.js';
import { generateSTL } from '../src/utils/stlExporter.js';

test('gear profile clamps unsafe numeric input and produces a closed outline candidate', () => {
    const gear = generateGearProfile(0, 3, 90, 10);

    assert.equal(gear.params.module, 0.1);
    assert.equal(gear.params.teeth, 6);
    assert.equal(gear.params.pressureAngleDeg, 40);
    assert.ok(gear.points.length > 0);
});

test('outer diameter sizing resolves the shared module from selected gear teeth', () => {
    assert.equal(calculateOuterDiameter(5, 20), 110);
    assert.equal(calculateModuleFromOuterDiameter(110, 20), 5);

    const config = {
        gearType: 'spur',
        sizingMode: 'gear2OuterDiameter',
        module: 5,
        targetOuterDiameter: 160,
        gear1: { teeth: 20 },
        gear2: { teeth: 30 }
    };

    assert.equal(resolveEffectiveModule(config), 5);
});

test('rack length is normalized to whole teeth to match generated tooth count', () => {
    const rack = generateRackProfile(2, 4.6, 20);

    assert.equal(rack.params.teeth, 5);
    assert.equal(rack.params.totalLength, Math.PI * 2 * 5);
    assert.ok(rack.points.length > 0);
});

test('rack export transform mirrors the canvas rack orientation', () => {
    const gear = generateGearProfile(2, 20, 20, 5);
    const rack = generateRackProfile(2, 10, 20);
    const centerDistance = gear.params.pitchDiameter / 2;
    const transformed = transformRackPointsForMesh(rack.points, gear.params, rack.params, centerDistance);

    assert.equal(transformed.length, rack.points.length);
    assert.equal(transformed[0].x, -rack.points[0].x);
    assert.equal(transformed[0].y, -rack.points[0].y + centerDistance);
});

test('SVG and DXF exporters emit usable 2D document bodies', () => {
    const gear1 = generateGearProfile(2, 20, 20, 5);
    const gear2 = generateGearProfile(2, 30, 20, 5);
    const centerDistance = 50;
    const config = { holeDiameter: 5, shaftType: 'custom', shaftTolerance: false };

    const svg = generateSVG(gear1, gear2, config, config, centerDistance);
    const dxf = generateDXF(gear1, gear2, config, config, centerDistance);

    assert.match(svg, /^<svg /);
    assert.match(svg, /<path /);
    assert.match(dxf, /SECTION/);
    assert.match(dxf, /LWPOLYLINE/);
    assert.match(dxf, /EOF/);
});

test('export layout separates selected parts by configured spacing', () => {
    const gear1 = generateGearProfile(2, 20, 20, 5);
    const gear2 = generateGearProfile(2, 30, 20, 5);
    const config = { holeDiameter: 5, shaftType: 'custom', shaftTolerance: false };
    const parts = buildExportParts(gear1, gear2, config, config, 50, {
        includeGear1: true,
        includeGear2: true,
        spacing: 25
    });

    assert.equal(parts.length, 2);
    assert.ok(parts[1].bounds.minX - parts[0].bounds.maxX >= 25);

    const gear2Only = buildExportParts(gear1, gear2, config, config, 50, {
        includeGear1: false,
        includeGear2: true,
        spacing: 25
    });

    assert.equal(gear2Only.length, 1);
    assert.equal(gear2Only[0].id, 'gear2');
});

test('STL exporter supports exporting a single selected part', () => {
    const gear1 = generateGearProfile(2, 20, 20, 5);
    const gear2 = generateGearProfile(2, 30, 20, 5);
    const config = { holeDiameter: 5, shaftType: 'custom', shaftTolerance: false };
    const stl = generateSTL(gear1, gear2, config, config, 50, 6, {
        includeGear1: false,
        includeGear2: true,
        spacing: 25
    });

    assert.match(stl, /^solid gears_design/);
    assert.match(stl, /facet normal/);
    assert.match(stl, /endsolid gears_design/);
});

test('STL exporter extrudes gear outlines with configured thickness', () => {
    const gear1 = generateGearProfile(2, 20, 20, 5);
    const gear2 = generateRackProfile(2, 10, 20);
    const centerDistance = gear1.params.pitchDiameter / 2;
    const gearConfig = { holeDiameter: 5, shaftType: 'custom', shaftTolerance: false };
    const stl = generateSTL(gear1, gear2, gearConfig, gearConfig, centerDistance, 6);

    assert.match(stl, /^solid gears_design/);
    assert.match(stl, /facet normal/);
    assert.match(stl, /vertex [\d.-]+ [\d.-]+ 6\.000000/);
    assert.match(stl, /endsolid gears_design/);
});

test('motor shaft presets generate non-circular shaft outlines', () => {
    const ttSpec = getShaftSpec({ shaftType: 'tt', shaftTolerance: true });
    const n20Spec = getShaftSpec({ shaftType: 'n20', shaftTolerance: false });

    assert.equal(ttSpec.kind, 'doubleD');
    assert.equal(ttSpec.diameter, 5.9);
    assert.equal(n20Spec.kind, 'singleD');
    assert.equal(n20Spec.diameter, 3);
    assert.ok(createShaftOutlinePoints(ttSpec).length > 4);
    assert.ok(createShaftOutlinePoints(n20Spec).length > 4);
});

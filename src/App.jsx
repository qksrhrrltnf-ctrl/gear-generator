
import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import GearCanvas from './components/GearCanvas';
import { generateGearProfile, generateRackProfile } from './utils/gearMath';
import { generateDXF, downloadDXF } from './utils/dxfExporter';
import { generateSVG, downloadSVG } from './utils/svgExporter';
import { generateSTL, downloadSTL } from './utils/stlExporter';
import { calculateOuterDiameter, resolveEffectiveModule, SIZING_MODES } from './utils/gearSizing';

function App() {
  const [config, setConfig] = useState({
    gearType: 'spur', // 'spur' or 'rack'
    sizingMode: SIZING_MODES.MODULE,
    module: 5,
    targetOuterDiameter: 110,
    pressureAngle: 20,
    backlash: 0.5,
    stlThickness: 5,
    exportOptions: {
      includeGear1: true,
      includeGear2: true,
      spacing: 10
    },
    gear1: {
      teeth: 20,
      holeDiameter: 10,
      shaftType: 'custom',
      shaftTolerance: false
    },
    gear2: {
      teeth: 30, // For rack, this will be length in teeth
      holeDiameter: 10,
      shaftType: 'custom',
      shaftTolerance: false
    }
  });

  const [rpm, setRpm] = useState(2);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const effectiveModule = useMemo(() => resolveEffectiveModule(config), [config]);

  // Generate gears whenever config changes
  const gear1 = useMemo(() => {
    return generateGearProfile(
      effectiveModule,
      config.gear1.teeth,
      config.pressureAngle,
      config.gear1.holeDiameter,
      config.gear1.shaftType,
      config.gear1.shaftTolerance
    );
  }, [effectiveModule, config.pressureAngle, config.gear1.teeth, config.gear1.holeDiameter, config.gear1.shaftType, config.gear1.shaftTolerance]);

  const gear2 = useMemo(() => {
    if (config.gearType === 'rack') {
      return generateRackProfile(
        effectiveModule,
        config.gear2.teeth, // This acts as length for rack
        config.pressureAngle
      );
    }
    return generateGearProfile(
      effectiveModule,
      config.gear2.teeth,
      config.pressureAngle,
      config.gear2.holeDiameter,
      config.gear2.shaftType,
      config.gear2.shaftTolerance
    );
  }, [config.gearType, effectiveModule, config.pressureAngle, config.gear2.teeth, config.gear2.holeDiameter, config.gear2.shaftType, config.gear2.shaftTolerance]);

  // Calculate center distance
  // For Spur: (d1 + d2) / 2 = m * (z1 + z2) / 2
  // For Rack: Pitch Radius of Gear 1 = m * z1 / 2
  const centerDistance = config.gearType === 'rack'
    ? (effectiveModule * config.gear1.teeth) / 2 + (config.backlash || 0)
    : (effectiveModule * (config.gear1.teeth + config.gear2.teeth)) / 2 + (config.backlash || 0);

  const gearStats = {
    centerDistance,
    effectiveModule,
    gear1OuterDiameter: calculateOuterDiameter(effectiveModule, config.gear1.teeth),
    gear2OuterDiameter: config.gearType === 'rack'
      ? null
      : calculateOuterDiameter(effectiveModule, config.gear2.teeth),
    ratio: config.gearType === 'rack'
      ? 0 // Ratio doesn't apply the same way, or maybe linear distance per revolution?
      : config.gear2.teeth / config.gear1.teeth
  };

  // Calculate rotation speed in radians per frame (assuming 60fps)
  // RPM = Revolutions Per Minute
  // Rad/s = RPM * 2PI / 60
  // Rad/frame = Rad/s / 60 = RPM * 2PI / 3600 = RPM * PI / 1800
  const rotationSpeed = (rpm * Math.PI) / 1800;

  const handleExport = (format) => {
    if (format === 'svg') {
      const svgContent = generateSVG(
        gear1,
        gear2,
        config.gear1,
        config.gear2,
        centerDistance,
        config.exportOptions
      );
      downloadSVG(svgContent, 'gears_design.svg');
    } else if (format === 'stl') {
      const stlContent = generateSTL(
        gear1,
        gear2,
        config.gear1,
        config.gear2,
        centerDistance,
        config.stlThickness,
        config.exportOptions
      );
      downloadSTL(stlContent, 'gears_design.stl');
    } else {
      const dxfContent = generateDXF(
        gear1,
        gear2,
        config.gear1,
        config.gear2,
        centerDistance,
        config.exportOptions
      );
      downloadDXF(dxfContent, 'gears_design.dxf');
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-100 overflow-hidden font-sans text-gray-900">
      <Sidebar
        config={config}
        setConfig={setConfig}
        onExport={handleExport}
        isAnimating={isAnimating}
        setIsAnimating={setIsAnimating}
        gearStats={gearStats}
        rpm={rpm}
        setRpm={setRpm}
        gear1={gear1}
        gear2={gear2}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        effectiveModule={effectiveModule}
      />

      <main className="flex-1 relative">
        <GearCanvas
          gear1={gear1}
          gear2={gear2}
          centerDistance={centerDistance}
          isAnimating={isAnimating}
          rotationSpeed={rotationSpeed}
          showGrid={showGrid}
          zoom={zoom}
          setZoom={setZoom}
        />
      </main>
    </div>
  );
}

export default App;

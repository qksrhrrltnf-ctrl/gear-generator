import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Play, Pause, ZoomIn, ZoomOut, RotateCcw, Download, FileText, Box } from 'lucide-react';
import { calculateRackMeshOffset } from '../utils/gearAlignment.js';
import { createShaftOutlinePoints, getShaftSpec } from '../utils/shaftProfiles.js';

const GearCanvas = ({
    gear1,
    gear2,
    centerDistance,
    isAnimating,
    setIsAnimating,
    rotationSpeed = 0.02,
    rpm,
    setRpm,
    showGrid = true,
    setShowGrid,
    zoom = 1,
    setZoom,
    config,
    setConfig,
    gearStats,
    onExport
}) => {
    const canvasRef = useRef(null);
    const requestRef = useRef();
    const angleRef = useRef(0);
    const isAnimatingRef = useRef(isAnimating);
    const rotationSpeedRef = useRef(rotationSpeed);
    const directionRef = useRef(1); // 1 for CW, -1 for CCW
    const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
    const [isExportPanelOpen, setIsExportPanelOpen] = useState(false);

    useEffect(() => {
        isAnimatingRef.current = isAnimating;
    }, [isAnimating]);

    useEffect(() => {
        rotationSpeedRef.current = rotationSpeed;
    }, [rotationSpeed]);

    const handleReset = () => {
        angleRef.current = 0;
        directionRef.current = 1;
    };

    const handleBacklashChange = (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return;

        setConfig(prev => ({
            ...prev,
            backlash: Math.min(10, Math.max(0, numeric))
        }));
    };

    const handleExportOptionChange = (key, value) => {
        setConfig(prev => ({
            ...prev,
            exportOptions: {
                ...prev.exportOptions,
                [key]: value
            }
        }));
    };

    const handleExportSpacingChange = (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return;

        handleExportOptionChange('spacing', Math.min(200, Math.max(0, numeric)));
    };

    const handleStlThicknessChange = (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return;

        setConfig(prev => ({
            ...prev,
            stlThickness: Math.min(50, Math.max(0.5, numeric))
        }));
    };

    const drawGrid = useCallback((ctx, width, height, scale, offsetX) => {
        if (!showGrid) return;

        const gridSize = 5; // 5mm
        const step = gridSize * scale;

        ctx.save();
        ctx.strokeStyle = '#e5e7eb'; // gray-200
        ctx.lineWidth = 1;

        // Vertical lines
        const centerX = width / 2 + offsetX * scale;
        const centerY = height / 2;

        // Draw vertical lines
        const startX = Math.floor(-centerX / step) * step + centerX;
        for (let x = startX; x < width; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Draw horizontal lines
        const startY = Math.floor(-centerY / step) * step + centerY;
        for (let y = startY; y < height; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw axes
        ctx.strokeStyle = '#9ca3af'; // gray-400
        ctx.lineWidth = 2;

        // X Axis
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        // Y Axis
        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, height);
        ctx.stroke();
        ctx.restore();
    }, [showGrid]);

    const drawGear = (ctx, gear, offsetX, offsetY, rotation, color, holeDiameter) => {
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.rotate(rotation);

        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.strokeStyle = '#1f2937'; // gray-800
        ctx.lineWidth = 1;

        if (gear.points.length > 0) {
            ctx.moveTo(gear.points[0].x, gear.points[0].y);
            for (let i = 1; i < gear.points.length; i++) {
                ctx.lineTo(gear.points[i].x, gear.points[i].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        // Draw Rack specific details
        if (gear.params.isRack) {
            // Draw Pitch Line (dashed)
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.setLineDash([10, 5]);
            // Draw line along X axis (pitch line)
            // Length is roughly totalLength
            const halfLen = gear.params.totalLength / 2;
            ctx.moveTo(-halfLen, 0);
            ctx.lineTo(halfLen, 0);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.restore();
            return;
        }

        // Draw Center Hole
        const shaftSpec = getShaftSpec({ ...gear.params, holeDiameter });
        if (shaftSpec?.kind === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, shaftSpec.diameter / 2, 0, 2 * Math.PI);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.stroke();
        } else if (shaftSpec) {
            const shaftPoints = createShaftOutlinePoints(shaftSpec);
            ctx.beginPath();
            ctx.moveTo(shaftPoints[0].x, shaftPoints[0].y);
            for (let i = 1; i < shaftPoints.length; i++) {
                ctx.lineTo(shaftPoints[i].x, shaftPoints[i].y);
            }
            ctx.closePath();
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.stroke();
        }

        // Draw Pitch Circle (dashed)
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.setLineDash([5, 5]);
        ctx.arc(0, 0, gear.params.pitchDiameter / 2, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw a marker to see rotation better
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.arc(gear.params.pitchDiameter / 2 - gear.params.module * 2, 0, gear.params.module / 2, 0, 2 * Math.PI);
        ctx.fill();

        ctx.restore();
    };

    const animate = useCallback(() => {
        if (isAnimatingRef.current) {
            // Reciprocating logic for Rack
            if (gear2.params.isRack) {
                const radius = gear1.params.pitchDiameter / 2;
                const linearMove = angleRef.current * radius;
                const maxTravel = gear2.params.totalLength / 2 - gear1.params.outerRadius; // Margin

                if (linearMove > maxTravel && directionRef.current > 0) {
                    directionRef.current = -1;
                }
                else if (linearMove < -maxTravel && directionRef.current < 0) {
                    directionRef.current = 1;
                }
            } else {
                directionRef.current = 1;
            }

            angleRef.current += rotationSpeedRef.current * directionRef.current;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Calculate base scale to fit gears
        let totalWidth;
        if (gear2.params.isRack) {
            totalWidth = Math.max(gear2.params.totalLength, gear1.params.outerRadius * 4);
        } else {
            totalWidth = (gear1.params.outerRadius) + centerDistance + (gear2.params.outerRadius);
        }

        const baseScale = Math.min(width, height) / (totalWidth * 1.2);
        const currentScale = baseScale * zoom;

        // Draw Grid first
        drawGrid(ctx, width, height, currentScale, 0);

        ctx.save();

        // Move origin to center of canvas
        ctx.translate(width / 2, height / 2);

        // Apply Scale
        ctx.scale(currentScale, currentScale);

        // If Rack, we center on Pinion.
        if (gear2.params.isRack) {
            ctx.translate(0, -centerDistance / 2);
        } else {
            ctx.translate(-centerDistance / 2, 0);
        }

        // Draw Gear 1 (Pinion)
        drawGear(ctx, gear1, 0, 0, angleRef.current, '#60a5fa', gear1.params.holeDiameter);

        if (gear2.params.isRack) {
            // Draw Rack
            const radius = gear1.params.pitchDiameter / 2;
            const linearMove = angleRef.current * radius;

            ctx.save();
            ctx.translate(0, centerDistance); // Move to rack position

            // Pinion CW (angle > 0) -> Rack should move LEFT (-X)
            // Currently linearMove follows angle sign.
            // So we need to invert linearMove for translation.

            const meshOffset = calculateRackMeshOffset(gear1.params, gear2.params);

            ctx.translate(-linearMove + meshOffset, 0);

            ctx.rotate(Math.PI); // Rotate to face teeth up

            // Draw the rack manually or call drawGear with 0 rotation (since we already rotated)
            drawGear(ctx, gear2, 0, 0, 0, '#f87171', 0);

            ctx.restore();

        } else {
            // Calculate Gear 2 rotation
            const ratio = gear1.params.teeth / gear2.params.teeth;
            const phaseShift = (gear2.params.teeth % 2 === 0) ? (Math.PI / gear2.params.teeth) : 0;
            const angle2 = -angleRef.current * ratio + phaseShift;

            // Draw Gear 2
            drawGear(ctx, gear2, centerDistance, 0, angle2, '#f87171', gear2.params.holeDiameter);
        }

        ctx.restore();
    }, [gear1, gear2, centerDistance, zoom, drawGrid]);

    useEffect(() => {
        const frame = () => {
            animate();
            requestRef.current = requestAnimationFrame(frame);
        };
        requestRef.current = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(requestRef.current);
    }, [animate]);

    // Handle resize
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current && canvasRef.current.parentElement) {
                canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
                canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="w-full h-full bg-gray-100 relative overflow-hidden">
            <canvas
                ref={canvasRef}
                className="block w-full h-full"
            />

            <div className="absolute top-4 right-4 z-10 flex max-w-[calc(100%-2rem)] flex-col items-end gap-3">
                <div className="flex flex-wrap justify-end gap-2">
                    <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 py-2 shadow-lg shadow-gray-900/10 backdrop-blur-md">
                        <Download className="h-4 w-4 text-blue-600" />
                        <button
                            onClick={() => setIsExportPanelOpen(prev => !prev)}
                            className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-black text-white transition-colors hover:bg-blue-700"
                        >
                            {isExportPanelOpen ? '내보내기 접기' : '내보내기'}
                        </button>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 py-2 shadow-lg shadow-gray-900/10 backdrop-blur-md">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${isAnimating ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {isAnimating ? 'RUNNING' : 'STOP'}
                        </span>
                        <button
                            onClick={() => setIsControlPanelOpen(prev => !prev)}
                            className="rounded-full bg-gray-950 px-3 py-1.5 text-xs font-black text-white transition-colors hover:bg-gray-800"
                        >
                            {isControlPanelOpen ? '제어판 접기' : '제어판'}
                        </button>
                    </div>
                </div>

                {isExportPanelOpen && (
                    <div className="w-80 max-w-full rounded-2xl border border-white/70 bg-white/90 p-4 shadow-xl shadow-gray-900/10 backdrop-blur-md">
                        <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Export</p>
                                <h2 className="mt-1 text-lg font-black text-gray-950">내보내기 메뉴</h2>
                            </div>
                            <button
                                onClick={() => setIsExportPanelOpen(false)}
                                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-200"
                            >
                                닫기
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => onExport('dxf')}
                                className="flex flex-col items-center justify-center gap-1 rounded-xl bg-gray-950 px-3 py-3 text-xs font-black text-white shadow-lg shadow-gray-900/20 transition-colors hover:bg-gray-800"
                            >
                                <FileText className="h-4 w-4" />
                                DXF
                            </button>
                            <button
                                onClick={() => onExport('svg')}
                                className="flex flex-col items-center justify-center gap-1 rounded-xl bg-slate-700 px-3 py-3 text-xs font-black text-white shadow-lg shadow-slate-700/20 transition-colors hover:bg-slate-600"
                            >
                                <FileText className="h-4 w-4" />
                                SVG
                            </button>
                            <button
                                onClick={() => onExport('stl')}
                                className="flex flex-col items-center justify-center gap-1 rounded-xl bg-blue-600 px-3 py-3 text-xs font-black text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-700"
                            >
                                <Box className="h-4 w-4" />
                                STL
                            </button>
                        </div>

                        <div className="mt-3 space-y-3 rounded-xl border border-blue-100 bg-blue-50/80 p-3">
                            <div className="grid grid-cols-2 gap-2 text-xs font-bold text-blue-950">
                                <label className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-sm">
                                    <input
                                        type="checkbox"
                                        checked={config.exportOptions.includeGear1}
                                        onChange={(e) => handleExportOptionChange('includeGear1', e.target.checked)}
                                        className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    기어 1
                                </label>
                                <label className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-sm">
                                    <input
                                        type="checkbox"
                                        checked={config.exportOptions.includeGear2}
                                        onChange={(e) => handleExportOptionChange('includeGear2', e.target.checked)}
                                        className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    {config.gearType === 'rack' ? '랙' : '기어 2'}
                                </label>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <label className="block">
                                    <span className="mb-1 block text-xs font-black text-blue-950">부품 간격</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="200"
                                        step="1"
                                        value={config.exportOptions.spacing}
                                        onChange={(e) => handleExportSpacingChange(e.target.value)}
                                        className="w-full rounded-lg border border-blue-200 bg-white px-2 py-2 text-sm font-bold text-blue-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-xs font-black text-blue-950">STL 두께</span>
                                    <input
                                        type="number"
                                        min="0.5"
                                        max="50"
                                        step="0.5"
                                        value={config.stlThickness}
                                        onChange={(e) => handleStlThicknessChange(e.target.value)}
                                        className="w-full rounded-lg border border-blue-200 bg-white px-2 py-2 text-sm font-bold text-blue-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </label>
                            </div>
                            <p className="text-xs font-medium text-blue-800">간격은 여러 부품 저장 배치에, 두께는 STL 저장에 사용됩니다.</p>
                        </div>
                    </div>
                )}

                {isControlPanelOpen && (
                    <div className="w-72 max-w-full rounded-2xl border border-white/70 bg-white/90 p-4 shadow-xl shadow-gray-900/10 backdrop-blur-md">
                        <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Simulation</p>
                                <h2 className="mt-1 text-lg font-black text-gray-950">맞물림 제어판</h2>
                            </div>
                            <button
                                onClick={() => setIsControlPanelOpen(false)}
                                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-200"
                            >
                                닫기
                            </button>
                        </div>

                        <button
                            onClick={() => setIsAnimating(!isAnimating)}
                            className={`mb-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white shadow-lg transition-all ${isAnimating
                                ? 'bg-amber-500 shadow-amber-500/30 hover:bg-amber-600'
                                : 'bg-gradient-to-r from-blue-600 to-cyan-500 shadow-blue-500/30 hover:from-blue-700 hover:to-cyan-600'
                                }`}
                        >
                            {isAnimating ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                            {isAnimating ? '일시 정지' : '시뮬레이션 시작'}
                        </button>

                        <div className="space-y-3">
                            <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <label className="text-sm font-bold text-blue-950">회전 속도</label>
                                    <span className="rounded-full bg-white px-3 py-1 font-mono text-sm font-bold text-blue-700 shadow-sm">{rpm} RPM</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="50"
                                    step="1"
                                    value={rpm}
                                    onChange={(e) => setRpm(parseInt(e.target.value, 10))}
                                    className="w-full cursor-pointer accent-blue-600"
                                />
                            </div>

                            <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <label htmlFor="canvas-backlash" className="text-sm font-bold text-amber-950">맞물림 간극</label>
                                    <span className="rounded-full bg-white px-3 py-1 font-mono text-sm font-bold text-amber-700 shadow-sm">{(config.backlash || 0).toFixed(1)} mm</span>
                                </div>
                                <input
                                    id="canvas-backlash"
                                    type="range"
                                    min="0"
                                    max="10"
                                    step="0.1"
                                    value={config.backlash || 0}
                                    onChange={(e) => handleBacklashChange(e.target.value)}
                                    className="w-full cursor-pointer accent-amber-500"
                                />
                                <div className="mt-2 flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        step="0.1"
                                        value={config.backlash || 0}
                                        onChange={(e) => handleBacklashChange(e.target.value)}
                                        className="w-20 rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-sm font-bold text-amber-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
                                    />
                                    <p className="text-xs font-medium text-amber-800">겹치면 올리고, 헐거우면 내리세요.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-center">
                                <div className="rounded-xl bg-gray-950 p-2.5 text-white">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Center</div>
                                    <div className="mt-1 font-mono text-sm font-black">{gearStats.centerDistance.toFixed(1)}</div>
                                    <div className="text-[10px] text-gray-400">mm</div>
                                </div>
                                <button
                                    onClick={handleReset}
                                    className="rounded-xl bg-white p-2.5 text-sm font-black text-gray-800 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-gray-50"
                                >
                                    Reset
                                    <RotateCcw className="mx-auto mt-1 h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Zoom Controls */}
            <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
                <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 p-2 shadow-lg backdrop-blur-sm">
                    <label className="flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-black text-gray-800 transition-colors hover:bg-gray-100">
                        <input
                            type="checkbox"
                            checked={showGrid}
                            onChange={(e) => setShowGrid(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        그리드
                    </label>
                    <div className="h-6 w-px bg-gray-200" />
                    <button
                        onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}
                        className="rounded-full p-2 text-gray-700 transition-colors hover:bg-gray-100"
                        title="축소 (Zoom Out)"
                    >
                        <ZoomOut className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => setZoom(1)}
                        className="w-16 rounded-full p-2 font-mono text-sm font-bold text-gray-700 transition-colors hover:bg-gray-100"
                        title="줌 초기화 (Reset Zoom)"
                    >
                        {Math.round(zoom * 100)}%
                    </button>
                    <button
                        onClick={() => setZoom(z => Math.min(5, z + 0.1))}
                        className="rounded-full p-2 text-gray-700 transition-colors hover:bg-gray-100"
                        title="확대 (Zoom In)"
                    >
                        <ZoomIn className="h-5 w-5" />
                    </button>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white/85 px-3 py-1.5 text-xs font-bold text-gray-600 shadow-md backdrop-blur-sm">
                    <span className="grid h-4 w-4 grid-cols-2 grid-rows-2 overflow-hidden rounded border border-blue-200 bg-white">
                        <span className="border-b border-r border-blue-200" />
                        <span className="border-b border-blue-200" />
                        <span className="border-r border-blue-200" />
                        <span />
                    </span>
                    그리드 1칸 = 5mm
                </div>
            </div>
        </div>
    );
};

export default GearCanvas;

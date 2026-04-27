import React, { useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { calculateRackMeshOffset } from '../utils/gearAlignment.js';
import { createShaftOutlinePoints, getShaftSpec } from '../utils/shaftProfiles.js';

const GearCanvas = ({
    gear1,
    gear2,
    centerDistance,
    isAnimating,
    rotationSpeed = 0.02,
    showGrid = true,
    zoom = 1,
    setZoom
}) => {
    const canvasRef = useRef(null);
    const requestRef = useRef();
    const angleRef = useRef(0);
    const isAnimatingRef = useRef(isAnimating);
    const rotationSpeedRef = useRef(rotationSpeed);
    const directionRef = useRef(1); // 1 for CW, -1 for CCW

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

            {/* Zoom Controls */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg flex items-center gap-2 border border-gray-200">
                <button
                    onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-700 transition-colors"
                    title="축소 (Zoom Out)"
                >
                    <ZoomOut className="w-5 h-5" />
                </button>
                <button
                    onClick={() => setZoom(1)}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-700 transition-colors font-mono text-sm w-16"
                    title="줌 초기화 (Reset Zoom)"
                >
                    {Math.round(zoom * 100)}%
                </button>
                <button
                    onClick={() => setZoom(z => Math.min(5, z + 0.1))}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-700 transition-colors"
                    title="확대 (Zoom In)"
                >
                    <ZoomIn className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                <button
                    onClick={handleReset}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-700 transition-colors"
                    title="시뮬레이션 초기화 (Reset)"
                >
                    <RotateCcw className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default GearCanvas;

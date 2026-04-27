
import React from 'react';
import { Settings, Download, Play, Pause } from 'lucide-react';
import { SIZING_MODES, SIZING_MODE_OPTIONS } from '../utils/gearSizing.js';
import { SHAFT_PRESETS, SHAFT_TYPES } from '../utils/shaftProfiles.js';

const NUMERIC_LIMITS = {
    module: { min: 0.1, max: 20, step: 0.1 },
    targetOuterDiameter: { min: 5, max: 1000, step: 0.1 },
    pressureAngle: { min: 5, max: 40, step: 0.5 },
    backlash: { min: 0, max: 2, step: 0.05 },
    stlThickness: { min: 0.5, max: 50, step: 0.5 },
    exportOptions: {
        spacing: { min: 0, max: 200, step: 1 }
    },
    gear1: {
        teeth: { min: 6, max: 200, step: 1, isInteger: true },
        holeDiameter: { min: 0, max: 80, step: 0.1 }
    },
    gear2: {
        teeth: { min: 6, max: 200, step: 1, isInteger: true },
        holeDiameter: { min: 0, max: 80, step: 0.1 }
    }
};

const isMotorShaft = (gearConfig) => gearConfig.shaftType && gearConfig.shaftType !== SHAFT_TYPES.CUSTOM;

const resolveNumericLimits = (key, nestedKey, gearType) => {
    const base = nestedKey ? NUMERIC_LIMITS[key]?.[nestedKey] : NUMERIC_LIMITS[key];
    if (key === 'gear2' && nestedKey === 'teeth' && gearType === 'rack') {
        return {
            min: 4,
            max: 400,
            step: 1,
            isInteger: true
        };
    }
    return base;
};

const parseNumericValue = (rawValue, limits) => {
    if (typeof rawValue === 'boolean') {
        return rawValue;
    }
    const numeric = Number(rawValue);
    if (!Number.isFinite(numeric)) {
        return null;
    }
    let nextValue = numeric;
    if (limits?.isInteger) {
        nextValue = Math.round(nextValue);
    }
    if (typeof limits?.min === 'number') {
        nextValue = Math.max(limits.min, nextValue);
    }
    if (typeof limits?.max === 'number') {
        nextValue = Math.min(limits.max, nextValue);
    }
    return nextValue;
};

const buildNumberInputProps = (limits) => {
    if (!limits) {
        return {};
    }
    const props = {};
    if (typeof limits.min === 'number') {
        props.min = limits.min;
    }
    if (typeof limits.max === 'number') {
        props.max = limits.max;
    }
    props.step = limits.step ?? (limits.isInteger ? 1 : 'any');
    return props;
};

const Sidebar = ({
    config,
    setConfig,
    onExport,
    isAnimating,
    setIsAnimating,
    gearStats,
    rpm,
    setRpm,
    gear1,
    gear2,
    showGrid,
    setShowGrid,
    effectiveModule
}) => {

    const getLimits = (key, nestedKey = null) => resolveNumericLimits(key, nestedKey, config.gearType);

    const getNumberProps = (key, nestedKey = null) => buildNumberInputProps(getLimits(key, nestedKey));

    const handleChange = (key, value, nestedKey = null) => {
        if (nestedKey) {
            if (typeof value === 'boolean' || nestedKey === 'shaftType') {
                setConfig(prev => ({
                    ...prev,
                    [key]: {
                        ...prev[key],
                        [nestedKey]: value
                    }
                }));
                return;
            }
            const limits = getLimits(key, nestedKey);
            const sanitized = parseNumericValue(value, limits);
            if (sanitized === null) {
                return;
            }
            setConfig(prev => ({
                ...prev,
                [key]: {
                    ...prev[key],
                    [nestedKey]: sanitized
                }
            }));
            return;
        }

        if (key === 'gearType') {
            setConfig(prev => ({
                ...prev,
                [key]: value,
                sizingMode: value === 'rack' && prev.sizingMode === SIZING_MODES.GEAR2_OUTER_DIAMETER
                    ? SIZING_MODES.GEAR1_OUTER_DIAMETER
                    : prev.sizingMode
            }));
            return;
        }

        if (key === 'sizingMode') {
            const nextTargetOuterDiameter = value === SIZING_MODES.GEAR2_OUTER_DIAMETER
                ? gearStats.gear2OuterDiameter ?? gearStats.gear1OuterDiameter
                : gearStats.gear1OuterDiameter;

            setConfig(prev => ({
                ...prev,
                sizingMode: value,
                targetOuterDiameter: Number(nextTargetOuterDiameter.toFixed(2))
            }));
            return;
        }

        const limits = getLimits(key);
        const sanitized = parseNumericValue(value, limits);
        if (sanitized === null) {
            return;
        }
        setConfig(prev => ({
            ...prev,
            [key]: sanitized
        }));
    };

    return (
        <div className="w-80 bg-white border-r border-gray-200 h-screen flex flex-col shadow-lg overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
                <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                    <Settings className="w-6 h-6" />
                    Gear Gen
                </h1>
                <p className="text-sm text-gray-500 mt-1">제작 : 세종 기술교사</p>
            </div>

            <div className="p-6 space-y-8 flex-1">
                {/* Common Settings */}
                <section>
                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">일반 설정 (Common Settings)</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">기어 타입 (Gear Type)</label>
                            <select
                                value={config.gearType}
                                onChange={(e) => handleChange('gearType', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                            >
                                <option value="spur">평기어 쌍 (Spur Gear Pair)</option>
                                <option value="rack">랙 & 피니언 (Rack & Pinion)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">크기 기준 (Sizing)</label>
                            <select
                                value={config.sizingMode}
                                onChange={(e) => handleChange('sizingMode', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                            >
                                {SIZING_MODE_OPTIONS
                                    .filter(option => config.gearType !== 'rack' || option.value !== SIZING_MODES.GEAR2_OUTER_DIAMETER)
                                    .map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">모듈 (Module)</label>
                            <input
                                type="number"
                                {...getNumberProps('module')}
                                value={config.sizingMode === SIZING_MODES.MODULE ? config.module : Number(effectiveModule.toFixed(3))}
                                onChange={(e) => handleChange('module', e.target.value)}
                                disabled={config.sizingMode !== SIZING_MODES.MODULE}
                                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${config.sizingMode !== SIZING_MODES.MODULE ? 'bg-gray-100 opacity-75 cursor-not-allowed' : ''}`}
                            />
                            {config.sizingMode !== SIZING_MODES.MODULE && (
                                <p className="text-xs text-gray-500 mt-1">목표 외경으로부터 자동 계산된 모듈입니다.</p>
                            )}
                        </div>
                        {config.sizingMode !== SIZING_MODES.MODULE && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">목표 외경 (Outer Diameter, mm)</label>
                                <input
                                    type="number"
                                    {...getNumberProps('targetOuterDiameter')}
                                    value={config.targetOuterDiameter}
                                    onChange={(e) => handleChange('targetOuterDiameter', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    {config.sizingMode === SIZING_MODES.GEAR1_OUTER_DIAMETER
                                        ? '기어 1 외경을 맞추고 공통 모듈을 역산합니다.'
                                        : '기어 2 외경을 맞추고 공통 모듈을 역산합니다.'}
                                </p>
                            </div>
                        )}
                        <div className="rounded-md bg-gray-50 border border-gray-200 p-3 text-xs text-gray-700 space-y-1">
                            <div className="flex justify-between">
                                <span>계산 모듈:</span>
                                <span className="font-mono">{gearStats.effectiveModule.toFixed(3)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>기어 1 외경:</span>
                                <span className="font-mono">{gearStats.gear1OuterDiameter.toFixed(2)} mm</span>
                            </div>
                            {gearStats.gear2OuterDiameter && (
                                <div className="flex justify-between">
                                    <span>기어 2 외경:</span>
                                    <span className="font-mono">{gearStats.gear2OuterDiameter.toFixed(2)} mm</span>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">압력각 (Pressure Angle, deg)</label>
                            <input
                                type="number"
                                {...getNumberProps('pressureAngle')}
                                value={config.pressureAngle}
                                onChange={(e) => handleChange('pressureAngle', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">공차 (Backlash, mm)</label>
                            <input
                                type="number"
                                {...getNumberProps('backlash')}
                                value={config.backlash || 0}
                                onChange={(e) => handleChange('backlash', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                            <p className="text-xs text-gray-500 mt-1">치형은 유지하고 중심 거리만 넓히는 맞물림 간극입니다.</p>
                        </div>
                    </div>
                </section>



                {/* View Settings */}
                <section>
                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">보기 설정 (View Settings)</h2>
                    <div className="flex items-center">
                        <input
                            id="showGrid"
                            type="checkbox"
                            checked={showGrid}
                            onChange={(e) => setShowGrid(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="showGrid" className="ml-2 block text-sm text-gray-900">
                            그리드 보기 (Show Grid, 5mm)
                        </label>
                    </div>
                </section>

                {/* Gear 1 Settings */}
                <section className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h2 className="text-sm font-semibold text-blue-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        기어 1 (구동, Driver)
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-blue-900 mb-1">잇수 (Teeth)</label>
                            <input
                                type="number"
                                {...getNumberProps('gear1', 'teeth')}
                                value={config.gear1.teeth}
                                onChange={(e) => handleChange('gear1', e.target.value, 'teeth')}
                                className="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-blue-900 mb-1">축 구멍 형식 (Shaft Hole)</label>
                            <select
                                value={config.gear1.shaftType}
                                onChange={(e) => handleChange('gear1', e.target.value, 'shaftType')}
                                className="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            >
                                {SHAFT_PRESETS.map(preset => (
                                    <option key={preset.value} value={preset.value}>{preset.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-blue-900 mb-1">구멍 지름 (Hole Diameter, mm)</label>
                            <input
                                type="number"
                                {...getNumberProps('gear1', 'holeDiameter')}
                                value={config.gear1.holeDiameter}
                                onChange={(e) => handleChange('gear1', e.target.value, 'holeDiameter')}
                                disabled={isMotorShaft(config.gear1)}
                                className={`w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${isMotorShaft(config.gear1) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            />
                        </div>
                        {isMotorShaft(config.gear1) && (
                            <div className="flex items-center ml-6">
                                <input
                                    id="g1-shaft-tolerance"
                                    type="checkbox"
                                    checked={config.gear1.shaftTolerance}
                                    onChange={(e) => handleChange('gear1', e.target.checked, 'shaftTolerance')}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-blue-300 rounded"
                                />
                                <label htmlFor="g1-shaft-tolerance" className="ml-2 block text-xs text-blue-800">
                                    모터축 여유 공차 (Tolerance)
                                </label>
                            </div>
                        )}
                    </div>
                </section>

                {/* Gear 2 Settings */}
                <section className="bg-red-50 p-4 rounded-lg border border-red-100">
                    <h2 className="text-sm font-semibold text-red-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        {config.gearType === 'rack' ? '랙 기어 (Rack, Driven)' : '기어 2 (피동, Driven)'}
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-red-900 mb-1">
                                {config.gearType === 'rack' ? '길이 (잇수 단위, Length in Teeth)' : '잇수 (Teeth)'}
                            </label>
                            <input
                                type="number"
                                {...getNumberProps('gear2', 'teeth')}
                                value={config.gear2.teeth}
                                onChange={(e) => handleChange('gear2', e.target.value, 'teeth')}
                                className="w-full px-3 py-2 border border-red-200 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                            />
                        </div>
                        {config.gearType !== 'rack' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-red-900 mb-1">축 구멍 형식 (Shaft Hole)</label>
                                    <select
                                        value={config.gear2.shaftType}
                                        onChange={(e) => handleChange('gear2', e.target.value, 'shaftType')}
                                        className="w-full px-3 py-2 border border-red-200 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                                    >
                                        {SHAFT_PRESETS.map(preset => (
                                            <option key={preset.value} value={preset.value}>{preset.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-red-900 mb-1">구멍 지름 (Hole Diameter, mm)</label>
                                    <input
                                        type="number"
                                        {...getNumberProps('gear2', 'holeDiameter')}
                                        value={config.gear2.holeDiameter}
                                        onChange={(e) => handleChange('gear2', e.target.value, 'holeDiameter')}
                                        disabled={isMotorShaft(config.gear2)}
                                        className={`w-full px-3 py-2 border border-red-200 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white ${isMotorShaft(config.gear2) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    />
                                </div>
                                {isMotorShaft(config.gear2) && (
                                    <div className="flex items-center ml-6">
                                        <input
                                            id="g2-shaft-tolerance"
                                            type="checkbox"
                                            checked={config.gear2.shaftTolerance}
                                            onChange={(e) => handleChange('gear2', e.target.checked, 'shaftTolerance')}
                                            className="h-4 w-4 text-red-600 focus:ring-red-500 border-red-300 rounded"
                                        />
                                        <label htmlFor="g2-shaft-tolerance" className="ml-2 block text-xs text-red-800">
                                            모터축 여유 공차 (Tolerance)
                                        </label>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </section>

                {/* Stats */}
                <section className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">정보 (Info)</h2>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">중심 거리 (Center Dist):</span>
                            <span className="font-mono font-medium">{gearStats.centerDistance.toFixed(2)} mm</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">{config.gearType === 'rack' ? '회전당 이동 (Travel/Rev):' : '기어비 (Ratio):'}</span>
                            <span className="font-mono font-medium">
                                {config.gearType === 'rack'
                                    ? `${(Math.PI * gearStats.effectiveModule * config.gear1.teeth).toFixed(2)} mm`
                                    : `${gearStats.ratio.toFixed(2)} : 1`
                                }
                            </span>
                        </div>
                        <div className="border-t border-gray-200 my-2 pt-2">
                            <div className="text-xs font-semibold text-blue-800 mb-1">기어 1 (Gear 1)</div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">외경 (Outer Dia):</span>
                                <span className="font-mono font-medium">{(gear1.params.outerRadius * 2).toFixed(2)} mm</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">이뿌리원 (Root Dia):</span>
                                <span className="font-mono font-medium">{(gear1.params.rootRadius * 2).toFixed(2)} mm</span>
                            </div>
                        </div>
                        <div className="border-t border-gray-200 my-2 pt-2">
                            <div className="text-xs font-semibold text-red-800 mb-1">{config.gearType === 'rack' ? '랙 (Rack)' : '기어 2 (Gear 2)'}</div>
                            {config.gearType === 'rack' ? (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">전체 길이 (Total Length):</span>
                                    <span className="font-mono font-medium">{gear2.params.totalLength.toFixed(2)} mm</span>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">외경 (Outer Dia):</span>
                                        <span className="font-mono font-medium">{(gear2.params.outerRadius * 2).toFixed(2)} mm</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">이뿌리원 (Root Dia):</span>
                                        <span className="font-mono font-medium">{(gear2.params.rootRadius * 2).toFixed(2)} mm</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </section>


                {/* Help / Guide */}
                <section className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">용어 설명 (Glossary)</h2>
                    <div className="space-y-2 text-xs text-gray-600">
                        <p><span className="font-semibold text-gray-800">Module (모듈):</span> 기어 이의 크기를 나타내는 단위입니다. 값이 클수록 이가 커집니다.</p>
                        <p><span className="font-semibold text-gray-800">Pressure Angle (압력각):</span> 기어 이의 기울기 각도입니다. 보통 20도를 사용합니다.</p>
                        <p><span className="font-semibold text-gray-800">Teeth (잇수):</span> 기어 이의 개수입니다.</p>
                        <p><span className="font-semibold text-gray-800">Hole Diameter (구멍 지름):</span> 기어 중앙의 축 구멍 크기입니다.</p>
                        <p><span className="font-semibold text-gray-800">Center Distance (중심 거리):</span> 두 기어 중심 사이의 거리입니다.</p>
                    </div>
                </section>
            </div>

            <div className="p-6 border-t border-gray-200 space-y-3 bg-gray-50">
                {/* Speed Control */}
                <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">속도 (Speed)</span>
                        <span className="font-mono text-gray-600">{rpm} RPM</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="50"
                        step="1"
                        value={rpm}
                        onChange={(e) => setRpm(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                </div>

                <button
                    onClick={() => setIsAnimating(!isAnimating)}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${isAnimating
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200'
                        : 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg'
                        }`}
                >
                    {isAnimating ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    {isAnimating ? '일시 정지 (Pause)' : '시뮬레이션 시작 (Start)'}
                </button>

                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 space-y-3">
                    <div>
                        <div className="text-xs font-semibold text-blue-900 mb-2">내보내기 설정 (Export)</div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-blue-900">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={config.exportOptions.includeGear1}
                                    onChange={(e) => handleChange('exportOptions', e.target.checked, 'includeGear1')}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-blue-300 rounded"
                                />
                                기어 1
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={config.exportOptions.includeGear2}
                                    onChange={(e) => handleChange('exportOptions', e.target.checked, 'includeGear2')}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-blue-300 rounded"
                                />
                                {config.gearType === 'rack' ? '랙' : '기어 2'}
                            </label>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-semibold text-blue-900 mb-1">부품 간격 (mm)</label>
                            <input
                                type="number"
                                {...getNumberProps('exportOptions', 'spacing')}
                                value={config.exportOptions.spacing}
                                onChange={(e) => handleChange('exportOptions', e.target.value, 'spacing')}
                                className="w-full px-2 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-blue-900 mb-1">STL 두께 (mm)</label>
                            <input
                                type="number"
                                {...getNumberProps('stlThickness')}
                                value={config.stlThickness}
                                onChange={(e) => handleChange('stlThickness', e.target.value)}
                                className="w-full px-2 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-blue-800">여러 부품을 저장할 때 간격을 두고 배치합니다. STL 두께는 STL 저장에만 사용됩니다.</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => onExport('dxf')}
                        className="flex items-center justify-center gap-2 px-3 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-all shadow-md hover:shadow-lg"
                    >
                        <Download className="w-4 h-4" />
                        DXF 저장
                    </button>
                    <button
                        onClick={() => onExport('svg')}
                        className="flex items-center justify-center gap-2 px-3 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-all shadow-md hover:shadow-lg"
                    >
                        <Download className="w-4 h-4" />
                        SVG 저장
                    </button>
                    <button
                        onClick={() => onExport('stl')}
                        className="flex items-center justify-center gap-2 px-3 py-3 bg-blue-700 text-white rounded-lg font-medium hover:bg-blue-600 transition-all shadow-md hover:shadow-lg"
                    >
                        <Download className="w-4 h-4" />
                        STL 저장
                    </button>
                </div>
            </div>
        </div >
    );
};

export default Sidebar;

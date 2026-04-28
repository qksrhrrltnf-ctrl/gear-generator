
import React from 'react';
import { Box, Gauge, HelpCircle, Info, Settings, SlidersHorizontal } from 'lucide-react';
import { SIZING_MODES, SIZING_MODE_OPTIONS } from '../utils/gearSizing.js';
import { SHAFT_PRESETS, SHAFT_TYPES } from '../utils/shaftProfiles.js';

const NUMERIC_LIMITS = {
    module: { min: 0.1, max: 20, step: 0.1 },
    targetOuterDiameter: { min: 5, max: 1000, step: 0.1 },
    pressureAngle: { min: 5, max: 40, step: 0.5 },
    backlash: { min: 0, max: 10, step: 0.1 },
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

const INPUT_BASE_CLASS = 'w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-bold shadow-sm outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none';
const ACCENT_STYLES = {
    blue: {
        card: 'border-blue-100 bg-gradient-to-br from-blue-50 to-white',
        icon: 'bg-blue-600 text-white',
        eyebrow: 'text-blue-600',
        label: 'text-blue-950',
        input: 'border-blue-200 focus:border-blue-500 focus:ring-blue-200',
        soft: 'bg-blue-100 text-blue-800'
    },
    red: {
        card: 'border-red-100 bg-gradient-to-br from-red-50 to-white',
        icon: 'bg-red-500 text-white',
        eyebrow: 'text-red-600',
        label: 'text-red-950',
        input: 'border-red-200 focus:border-red-500 focus:ring-red-200',
        soft: 'bg-red-100 text-red-800'
    },
    amber: {
        card: 'border-amber-100 bg-gradient-to-br from-amber-50 to-white',
        icon: 'bg-amber-500 text-white',
        eyebrow: 'text-amber-600',
        label: 'text-amber-950',
        input: 'border-amber-200 focus:border-amber-500 focus:ring-amber-200',
        soft: 'bg-amber-100 text-amber-800'
    },
    slate: {
        card: 'border-slate-200 bg-white',
        icon: 'bg-slate-950 text-white',
        eyebrow: 'text-slate-500',
        label: 'text-slate-800',
        input: 'border-slate-200 focus:border-slate-500 focus:ring-slate-200',
        soft: 'bg-slate-100 text-slate-700'
    }
};

const getInputClass = (accent = 'slate') => `${INPUT_BASE_CLASS} ${ACCENT_STYLES[accent].input}`;

const PanelCard = ({ accent = 'slate', icon: Icon, eyebrow, title, description, children }) => {
    const styles = ACCENT_STYLES[accent];

    return (
        <section className={`rounded-3xl border p-4 shadow-sm ${styles.card}`}>
            <div className="mb-4 flex items-start gap-3">
                <div className={`rounded-2xl p-2.5 shadow-sm ${styles.icon}`}>
                    {React.createElement(Icon, { className: 'h-5 w-5' })}
                </div>
                <div>
                    <p className={`text-[11px] font-black uppercase tracking-[0.18em] ${styles.eyebrow}`}>{eyebrow}</p>
                    <h2 className="mt-1 text-base font-black text-slate-950">{title}</h2>
                    {description && <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">{description}</p>}
                </div>
            </div>
            {children}
        </section>
    );
};

const Field = ({ accent = 'slate', label, value, helper, children }) => {
    const styles = ACCENT_STYLES[accent];

    return (
        <div className="rounded-2xl border border-white/70 bg-white/75 p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-3">
                <label className={`text-sm font-black ${styles.label}`}>{label}</label>
                {value !== undefined && (
                    <span className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-xs font-black ${styles.soft}`}>
                        {value}
                    </span>
                )}
            </div>
            {children}
            {helper && <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">{helper}</p>}
        </div>
    );
};

const MetricRow = ({ label, value, accent = 'slate' }) => (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
        <span className="text-xs font-bold text-slate-500">{label}</span>
        <span className={`rounded-full px-2.5 py-1 font-mono text-xs font-black ${ACCENT_STYLES[accent].soft}`}>{value}</span>
    </div>
);

const Sidebar = ({
    config,
    setConfig,
    gearStats,
    gear1,
    gear2,
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
        <div className="h-screen w-[340px] shrink-0 overflow-hidden border-r border-slate-200 bg-slate-100 shadow-2xl shadow-slate-900/10">
            <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-5 text-white">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-cyan-300">Gear Studio</p>
                        <h1 className="mt-2 flex items-center gap-2 text-2xl font-black">
                            <Settings className="h-6 w-6 text-cyan-300" />
                            Gear Gen
                        </h1>
                        <p className="mt-1 text-xs font-medium text-slate-300">제작 : 세종 기술교사</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 px-3 py-2 text-right ring-1 ring-white/10">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Mode</div>
                        <div className="mt-1 text-sm font-black text-white">{config.gearType === 'rack' ? 'Rack' : 'Spur'}</div>
                    </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Module</div>
                        <div className="mt-1 font-mono text-lg font-black text-cyan-200">{gearStats.effectiveModule.toFixed(3)}</div>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Center</div>
                        <div className="mt-1 font-mono text-lg font-black text-cyan-200">{gearStats.centerDistance.toFixed(1)}</div>
                    </div>
                </div>
            </div>

            <div className="h-[calc(100vh-180px)] space-y-4 overflow-y-auto p-4">
                {/* Common Settings */}
                <PanelCard
                    accent="slate"
                    icon={SlidersHorizontal}
                    eyebrow="Design Setup"
                    title="기본 설계값"
                    description="기어 타입, 크기 기준, 모듈과 압력각을 먼저 잡습니다."
                >
                    <div className="space-y-3">
                        <Field accent="slate" label="기어 타입" value={config.gearType === 'rack' ? '랙 & 피니언' : '평기어 쌍'}>
                            <select
                                value={config.gearType}
                                onChange={(e) => handleChange('gearType', e.target.value)}
                                className={getInputClass('slate')}
                            >
                                <option value="spur">평기어 쌍 (Spur Gear Pair)</option>
                                <option value="rack">랙 & 피니언 (Rack & Pinion)</option>
                            </select>
                        </Field>
                        <Field accent="slate" label="크기 기준">
                            <select
                                value={config.sizingMode}
                                onChange={(e) => handleChange('sizingMode', e.target.value)}
                                className={getInputClass('slate')}
                            >
                                {SIZING_MODE_OPTIONS
                                    .filter(option => config.gearType !== 'rack' || option.value !== SIZING_MODES.GEAR2_OUTER_DIAMETER)
                                    .map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                            </select>
                        </Field>
                        <Field
                            accent="blue"
                            label="모듈"
                            value={`${Number(effectiveModule.toFixed(3))}`}
                            helper={config.sizingMode !== SIZING_MODES.MODULE ? '목표 외경으로부터 자동 계산된 모듈입니다.' : null}
                        >
                            <input
                                type="number"
                                {...getNumberProps('module')}
                                value={config.sizingMode === SIZING_MODES.MODULE ? config.module : Number(effectiveModule.toFixed(3))}
                                onChange={(e) => handleChange('module', e.target.value)}
                                disabled={config.sizingMode !== SIZING_MODES.MODULE}
                                className={getInputClass('blue')}
                            />
                        </Field>
                        {config.sizingMode !== SIZING_MODES.MODULE && (
                            <Field
                                accent="blue"
                                label="목표 외경"
                                value={`${config.targetOuterDiameter} mm`}
                                helper={config.sizingMode === SIZING_MODES.GEAR1_OUTER_DIAMETER
                                    ? '기어 1 외경을 맞추고 공통 모듈을 역산합니다.'
                                    : '기어 2 외경을 맞추고 공통 모듈을 역산합니다.'}
                            >
                                <input
                                    type="number"
                                    {...getNumberProps('targetOuterDiameter')}
                                    value={config.targetOuterDiameter}
                                    onChange={(e) => handleChange('targetOuterDiameter', e.target.value)}
                                    className={getInputClass('blue')}
                                />
                            </Field>
                        )}
                        <div className="grid gap-2">
                            <MetricRow label="계산 모듈" value={gearStats.effectiveModule.toFixed(3)} accent="blue" />
                            <MetricRow label="기어 1 외경" value={`${gearStats.gear1OuterDiameter.toFixed(2)} mm`} accent="blue" />
                            {gearStats.gear2OuterDiameter && (
                                <MetricRow label="기어 2 외경" value={`${gearStats.gear2OuterDiameter.toFixed(2)} mm`} accent="red" />
                            )}
                        </div>
                        <Field accent="amber" label="압력각" value={`${config.pressureAngle}°`}>
                            <input
                                type="number"
                                {...getNumberProps('pressureAngle')}
                                value={config.pressureAngle}
                                onChange={(e) => handleChange('pressureAngle', e.target.value)}
                                className={getInputClass('amber')}
                            />
                        </Field>
                        <Field
                            accent="amber"
                            label="맞물림 간극"
                            value={`${(config.backlash || 0).toFixed(1)} mm`}
                            helper="치형은 유지하고 중심 거리만 넓히는 맞물림 간극입니다. 겹쳐 보이면 값을 키우세요."
                        >
                            <input
                                type="number"
                                {...getNumberProps('backlash')}
                                value={config.backlash || 0}
                                onChange={(e) => handleChange('backlash', e.target.value)}
                                className={getInputClass('amber')}
                            />
                        </Field>
                    </div>
                </PanelCard>
                {/* Gear 1 Settings */}
                <PanelCard
                    accent="blue"
                    icon={Gauge}
                    eyebrow="Driver Gear"
                    title="기어 1 · 구동"
                    description="파란색 기어의 잇수와 축 구멍을 설정합니다."
                >
                    <div className="space-y-3">
                        <Field accent="blue" label="잇수" value={`${config.gear1.teeth} T`}>
                            <input
                                type="number"
                                {...getNumberProps('gear1', 'teeth')}
                                value={config.gear1.teeth}
                                onChange={(e) => handleChange('gear1', e.target.value, 'teeth')}
                                className={getInputClass('blue')}
                            />
                        </Field>
                        <Field accent="blue" label="축 구멍 형식">
                            <select
                                value={config.gear1.shaftType}
                                onChange={(e) => handleChange('gear1', e.target.value, 'shaftType')}
                                className={getInputClass('blue')}
                            >
                                {SHAFT_PRESETS.map(preset => (
                                    <option key={preset.value} value={preset.value}>{preset.label}</option>
                                ))}
                            </select>
                        </Field>
                        <Field
                            accent="blue"
                            label="구멍 지름"
                            value={`${config.gear1.holeDiameter} mm`}
                            helper={isMotorShaft(config.gear1) ? '모터축 프리셋을 선택하면 구멍 치수는 자동 적용됩니다.' : null}
                        >
                            <input
                                type="number"
                                {...getNumberProps('gear1', 'holeDiameter')}
                                value={config.gear1.holeDiameter}
                                onChange={(e) => handleChange('gear1', e.target.value, 'holeDiameter')}
                                disabled={isMotorShaft(config.gear1)}
                                className={getInputClass('blue')}
                            />
                        </Field>
                        {isMotorShaft(config.gear1) && (
                            <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-blue-100">
                                <span className="text-xs font-black text-blue-900">모터축 여유 공차</span>
                                <input
                                    id="g1-shaft-tolerance"
                                    type="checkbox"
                                    checked={config.gear1.shaftTolerance}
                                    onChange={(e) => handleChange('gear1', e.target.checked, 'shaftTolerance')}
                                    className="h-5 w-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                                />
                            </label>
                        )}
                    </div>
                </PanelCard>

                {/* Gear 2 Settings */}
                <PanelCard
                    accent="red"
                    icon={Box}
                    eyebrow={config.gearType === 'rack' ? 'Driven Rack' : 'Driven Gear'}
                    title={config.gearType === 'rack' ? '랙 · 피동' : '기어 2 · 피동'}
                    description={config.gearType === 'rack' ? '랙 길이는 잇수 단위로 입력합니다.' : '빨간색 기어의 잇수와 축 구멍을 설정합니다.'}
                >
                    <div className="space-y-3">
                        <Field
                            accent="red"
                            label={config.gearType === 'rack' ? '길이 단위' : '잇수'}
                            value={config.gearType === 'rack' ? `${config.gear2.teeth} T 길이` : `${config.gear2.teeth} T`}
                        >
                            <input
                                type="number"
                                {...getNumberProps('gear2', 'teeth')}
                                value={config.gear2.teeth}
                                onChange={(e) => handleChange('gear2', e.target.value, 'teeth')}
                                className={getInputClass('red')}
                            />
                        </Field>
                        {config.gearType !== 'rack' && (
                            <>
                                <Field accent="red" label="축 구멍 형식">
                                    <select
                                        value={config.gear2.shaftType}
                                        onChange={(e) => handleChange('gear2', e.target.value, 'shaftType')}
                                        className={getInputClass('red')}
                                    >
                                        {SHAFT_PRESETS.map(preset => (
                                            <option key={preset.value} value={preset.value}>{preset.label}</option>
                                        ))}
                                    </select>
                                </Field>
                                <Field
                                    accent="red"
                                    label="구멍 지름"
                                    value={`${config.gear2.holeDiameter} mm`}
                                    helper={isMotorShaft(config.gear2) ? '모터축 프리셋을 선택하면 구멍 치수는 자동 적용됩니다.' : null}
                                >
                                    <input
                                        type="number"
                                        {...getNumberProps('gear2', 'holeDiameter')}
                                        value={config.gear2.holeDiameter}
                                        onChange={(e) => handleChange('gear2', e.target.value, 'holeDiameter')}
                                        disabled={isMotorShaft(config.gear2)}
                                        className={getInputClass('red')}
                                    />
                                </Field>
                                {isMotorShaft(config.gear2) && (
                                    <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-red-100">
                                        <span className="text-xs font-black text-red-900">모터축 여유 공차</span>
                                        <input
                                            id="g2-shaft-tolerance"
                                            type="checkbox"
                                            checked={config.gear2.shaftTolerance}
                                            onChange={(e) => handleChange('gear2', e.target.checked, 'shaftTolerance')}
                                            className="h-5 w-5 rounded border-red-300 text-red-600 focus:ring-red-500"
                                        />
                                    </label>
                                )}
                            </>
                        )}
                    </div>
                </PanelCard>

                {/* Stats */}
                <PanelCard
                    accent="slate"
                    icon={Info}
                    eyebrow="Live Output"
                    title="계산 결과"
                    description="입력값 변경에 따라 즉시 갱신되는 주요 치수입니다."
                >
                    <div className="grid gap-2">
                        <MetricRow label="중심 거리" value={`${gearStats.centerDistance.toFixed(2)} mm`} />
                        <MetricRow
                            label={config.gearType === 'rack' ? '회전당 이동' : '기어비'}
                            value={config.gearType === 'rack'
                                ? `${(Math.PI * gearStats.effectiveModule * config.gear1.teeth).toFixed(2)} mm`
                                : `${gearStats.ratio.toFixed(2)} : 1`}
                        />
                        <div className="mt-1 grid grid-cols-2 gap-2">
                            <div className="rounded-2xl bg-blue-50 p-3 ring-1 ring-blue-100">
                                <div className="text-[10px] font-black uppercase tracking-wider text-blue-700">Gear 1</div>
                                <div className="mt-2 space-y-1 text-xs font-bold text-blue-950">
                                    <div className="flex justify-between gap-2"><span>외경</span><span className="font-mono">{(gear1.params.outerRadius * 2).toFixed(2)}</span></div>
                                    <div className="flex justify-between gap-2"><span>이뿌리</span><span className="font-mono">{(gear1.params.rootRadius * 2).toFixed(2)}</span></div>
                                </div>
                            </div>
                            <div className="rounded-2xl bg-red-50 p-3 ring-1 ring-red-100">
                                <div className="text-[10px] font-black uppercase tracking-wider text-red-700">{config.gearType === 'rack' ? 'Rack' : 'Gear 2'}</div>
                                <div className="mt-2 space-y-1 text-xs font-bold text-red-950">
                                    {config.gearType === 'rack' ? (
                                        <div className="flex justify-between gap-2"><span>전체 길이</span><span className="font-mono">{gear2.params.totalLength.toFixed(2)}</span></div>
                                    ) : (
                                        <>
                                            <div className="flex justify-between gap-2"><span>외경</span><span className="font-mono">{(gear2.params.outerRadius * 2).toFixed(2)}</span></div>
                                            <div className="flex justify-between gap-2"><span>이뿌리</span><span className="font-mono">{(gear2.params.rootRadius * 2).toFixed(2)}</span></div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </PanelCard>


                {/* Help / Guide */}
                <PanelCard
                    accent="slate"
                    icon={HelpCircle}
                    eyebrow="Glossary"
                    title="용어 설명"
                >
                    <div className="space-y-2 text-xs font-medium leading-relaxed text-slate-600">
                        <p><span className="font-black text-slate-900">Module:</span> 기어 이의 크기입니다. 값이 클수록 이가 커집니다.</p>
                        <p><span className="font-black text-slate-900">Pressure Angle:</span> 기어 이의 기울기 각도입니다. 보통 20도를 사용합니다.</p>
                        <p><span className="font-black text-slate-900">Teeth:</span> 기어 이의 개수입니다.</p>
                        <p><span className="font-black text-slate-900">Hole Diameter:</span> 기어 중앙의 축 구멍 크기입니다.</p>
                        <p><span className="font-black text-slate-900">Center Distance:</span> 두 기어 중심 사이의 거리입니다.</p>
                    </div>
                </PanelCard>
            </div>

        </div>
    );
};

export default Sidebar;

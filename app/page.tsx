'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Settings,
  Menu,
  Bell,
  Activity,
  Wind,
  Zap,
  TrendingUp,
  TrendingDown,
  Thermometer,
  Gauge,
  Radio,
  AlertTriangle,
  CheckCircle,
  X,
} from 'lucide-react';

// --- Simulasi data sensor (bisa diganti dengan data real dari API) ---
function useSimulatedData() {
  const [dht22Temp, setDht22Temp] = useState(26.4);
  const [dht22Hum, setDht22Hum] = useState(62.1);
  const [adxl345, setAdxl345] = useState({ x: 0.12, y: -0.08, z: 9.81 });
  const [mq135, setMq135] = useState(412);
  const [mq2, setMq2] = useState(180);
  const [ledOn, setLedOn] = useState(true);
  const [buzzerOn, setBuzzerOn] = useState(false);
  const [historyData, setHistoryData] = useState<number[]>(
    Array.from({ length: 20 }, () => 24 + Math.random() * 6)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setDht22Temp((v) => parseFloat((v + (Math.random() - 0.5) * 0.3).toFixed(1)));
      setDht22Hum((v) => parseFloat(Math.min(100, Math.max(30, v + (Math.random() - 0.5) * 0.5)).toFixed(1)));
      setAdxl345({
        x: parseFloat(((Math.random() - 0.5) * 0.4).toFixed(3)),
        y: parseFloat(((Math.random() - 0.5) * 0.4).toFixed(3)),
        z: parseFloat((9.81 + (Math.random() - 0.5) * 0.1).toFixed(3)),
      });
      setMq135((v) => Math.round(Math.min(1000, Math.max(300, v + (Math.random() - 0.5) * 15))));
      setMq2((v) => Math.round(Math.min(800, Math.max(100, v + (Math.random() - 0.5) * 10))));
      setHistoryData((prev) => [...prev.slice(1), parseFloat((24 + Math.random() * 6).toFixed(1))]);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return { dht22Temp, dht22Hum, adxl345, mq135, mq2, ledOn, setLedOn, buzzerOn, setBuzzerOn, historyData };
}

function Sparkline({ data, color = '#60a5fa' }: { data: number[]; color?: string }) {
  const w = 200, h = 50;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');
  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// --- Gauge Arc ---
function GaugeArc({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(value / max, 1);
  const r = 36;
  const cx = 50, cy = 50;
  const startAngle = -210;
  const sweepAngle = 240;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPath = (angle: number) => {
    const rad = toRad(angle);
    return `${cx + r * Math.cos(rad)},${cy + r * Math.sin(rad)}`;
  };
  const endAngle = startAngle + sweepAngle * pct;

  const describeArc = (start: number, end: number) => {
    const s = arcPath(start);
    const e = arcPath(end);
    const large = end - start > 180 ? 1 : 0;
    return `M ${s} A ${r} ${r} 0 ${large} 1 ${e}`;
  };

  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24">
      <path d={describeArc(startAngle, startAngle + sweepAngle)} fill="none" stroke="#1e2533" strokeWidth="8" strokeLinecap="round" />
      <path d={describeArc(startAngle, endAngle)} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

// --- Axis Bar ---
function AxisBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.min(Math.abs(value) / 2, 1) * 100;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-4 font-mono font-bold" style={{ color }}>{label}</span>
      <div className="flex-1 h-2 bg-[#1e2533] rounded-full overflow-hidden relative">
        <div
          className="absolute top-0 h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color, left: '50%', transform: 'translateX(-50%)' }}
        />
      </div>
      <span className="w-16 text-right font-mono text-gray-400">{value > 0 ? '+' : ''}{value.toFixed(3)}</span>
    </div>
  );
}

export default function Dashboard() {
  const {
    dht22Temp, dht22Hum,
    adxl345, mq135, mq2,
    ledOn, setLedOn,
    buzzerOn, setBuzzerOn,
    historyData,
  } = useSimulatedData();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alerts, setAlerts] = useState<string[]>([]);

  // Deteksi alert
  useEffect(() => {
    const newAlerts: string[] = [];
    if (mq135 > 700) newAlerts.push('CO₂/Gas level tinggi! (MQ-135)');
    if (mq2 > 500) newAlerts.push('Asap/Gas terdeteksi! (MQ-2)');
    if (dht22Temp > 35) newAlerts.push('Suhu terlalu tinggi!');
    setAlerts(newAlerts);
  }, [mq135, mq2, dht22Temp]);

  const mq135Status = mq135 < 500 ? { label: 'Normal', color: '#34d399', bg: 'bg-emerald-900/30' }
    : mq135 < 700 ? { label: 'Sedang', color: '#fbbf24', bg: 'bg-yellow-900/30' }
      : { label: 'Bahaya', color: '#f87171', bg: 'bg-red-900/30' };

  const mq2Status = mq2 < 300 ? { label: 'Aman', color: '#34d399', bg: 'bg-emerald-900/30' }
    : mq2 < 500 ? { label: 'Waspada', color: '#fbbf24', bg: 'bg-yellow-900/30' }
      : { label: 'Bahaya', color: '#f87171', bg: 'bg-red-900/30' };

  return (
    <div className="flex h-screen bg-[#0e1116] text-white overflow-hidden">

      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static z-30 w-64 p-6 border-r border-gray-800 h-full flex flex-col transition-transform duration-300 shadow-2xl
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        style={{ backgroundColor: '#15181e', opacity: 1 }}
      >
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-blue-400">IoT</span> Monitor
          </h1>
          <button className="lg:hidden text-gray-500" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="space-y-2 flex-1">
          <div className="flex items-center gap-3 p-3 bg-blue-900/30 text-blue-400 rounded-lg cursor-pointer">
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-sm font-medium">Dashboard</span>
          </div>
          <div className="flex items-center gap-3 p-3 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
            <Activity className="w-5 h-5" />
            <span className="text-sm font-medium">Analytics</span>
          </div>
          <div className="flex items-center gap-3 p-3 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
            <Settings className="w-5 h-5" />
            <span className="text-sm font-medium">Settings</span>
          </div>
        </nav>

        {/* Status ESP32 */}
        <div className="mt-auto pt-4 border-t border-gray-800">
          <div className="flex items-center gap-2 bg-emerald-950 border border-emerald-800 rounded-lg px-3 py-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div>
              <p className="text-xs font-semibold text-emerald-300">ESP32 Online</p>
              <p className="text-xs text-emerald-600">192.168.1.105</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Header */}
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-[#0e1116] shrink-0">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-gray-400" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-gray-200">Dashboard Real-Time</h2>
              <p className="text-xs text-gray-500">Update setiap 1.5 detik</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {alerts.length > 0 && (
              <span className="text-xs text-red-400 bg-red-900/30 px-3 py-1 rounded-full flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-3 h-3" /> {alerts.length} Alert
              </span>
            )}
            <span className="text-sm font-semibold text-white bg-emerald-600 px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              1 Online
            </span>
            <Bell className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white transition-colors" />
            <Settings className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white transition-colors" />
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-6 max-w-6xl mx-auto">

            {/* Alert Banner */}
            {alerts.length > 0 && (
              <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-300 mb-1">Peringatan Aktif</p>
                  {alerts.map((a, i) => <p key={i} className="text-xs text-red-400">{a}</p>)}
                </div>
              </div>
            )}

            {/* Grid Anakan — 4 Sensor Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* ── Card 1: DHT22 (Suhu & Kelembaban) ── */}
              <div className="bg-[#171c25] border border-gray-800 p-6 rounded-xl min-h-[200px]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">DHT22</h3>
                    <p className="text-xs text-gray-600 mt-0.5">Suhu & Kelembaban</p>
                  </div>
                  <Thermometer className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex gap-6 items-end">
                  <div>
                    <span className="text-5xl font-bold text-blue-100 tabular-nums">{dht22Temp}</span>
                    <span className="text-xl text-gray-500">°C</span>
                    <p className="text-xs text-gray-500 mt-1">Suhu</p>
                  </div>
                  <div>
                    <span className="text-3xl font-bold text-cyan-300 tabular-nums">{dht22Hum}</span>
                    <span className="text-lg text-gray-500">%</span>
                    <p className="text-xs text-gray-500 mt-1">Humidity</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Sparkline data={historyData} color="#60a5fa" />
                </div>
              </div>

              {/* ── Card 2: ADXL345 (Akselerometer) ── */}
              <div className="bg-[#171c25] border border-gray-800 p-6 rounded-xl min-h-[200px]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">ADXL345</h3>
                    <p className="text-xs text-gray-600 mt-0.5">Akselerometer 3-Axis</p>
                  </div>
                  <Activity className="w-5 h-5 text-purple-400" />
                </div>

                {/* Status gerak */}
                {(() => {
                  const totalAccel = Math.sqrt(adxl345.x ** 2 + adxl345.y ** 2 + adxl345.z ** 2);
                  const isShaking = Math.abs(totalAccel - 9.81) > 0.5;
                  return (
                    <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full mb-4 ${isShaking ? 'bg-orange-900/30 text-orange-400' : 'bg-emerald-900/30 text-emerald-400'}`}>
                      {isShaking ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                      {isShaking ? 'Gerakan Terdeteksi' : 'Statis'}
                    </div>
                  );
                })()}

                <div className="space-y-3">
                  <AxisBar label="X" value={adxl345.x} color="#c084fc" />
                  <AxisBar label="Y" value={adxl345.y} color="#60a5fa" />
                  <AxisBar label="Z" value={adxl345.z} color="#34d399" />
                </div>
                <p className="text-xs text-gray-600 mt-3">Satuan: m/s²</p>
              </div>

              {/* ── Card 3: Output Devices (LED & Buzzer) ── */}
              <div className="bg-[#171c25] border border-gray-800 p-6 rounded-xl min-h-[200px]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Output Devices</h3>
                    <p className="text-xs text-gray-600 mt-0.5">LED & Buzzer Control</p>
                  </div>
                  <Zap className="w-5 h-5 text-yellow-400" />
                </div>

                <div className="space-y-4">
                  {/* LED Toggle */}
                  <div className="flex items-center justify-between bg-[#0e1116] rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${ledOn ? 'bg-yellow-400/20 shadow-[0_0_15px_rgba(250,204,21,0.4)]' : 'bg-gray-800'}`}>
                        <span className={`text-lg ${ledOn ? '' : 'grayscale opacity-30'}`}>💡</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">LED</p>
                        <p className={`text-xs ${ledOn ? 'text-yellow-400' : 'text-gray-500'}`}>{ledOn ? 'Menyala' : 'Mati'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setLedOn(!ledOn)}
                      className={`w-12 h-6 rounded-full transition-all duration-300 relative ${ledOn ? 'bg-yellow-500' : 'bg-gray-700'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow ${ledOn ? 'left-6' : 'left-0.5'}`} />
                    </button>
                  </div>

                  {/* Buzzer Toggle */}
                  <div className="flex items-center justify-between bg-[#0e1116] rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${buzzerOn ? 'bg-red-400/20 shadow-[0_0_15px_rgba(248,113,113,0.4)]' : 'bg-gray-800'}`}>
                        <Radio className={`w-4 h-4 ${buzzerOn ? 'text-red-400 animate-pulse' : 'text-gray-600'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">Buzzer</p>
                        <p className={`text-xs ${buzzerOn ? 'text-red-400' : 'text-gray-500'}`}>{buzzerOn ? 'Aktif' : 'Nonaktif'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setBuzzerOn(!buzzerOn)}
                      className={`w-12 h-6 rounded-full transition-all duration-300 relative ${buzzerOn ? 'bg-red-500' : 'bg-gray-700'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow ${buzzerOn ? 'left-6' : 'left-0.5'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Card 4: MQ Series (Gas Sensor) ── */}
              <div className="bg-[#171c25] border border-gray-800 p-6 rounded-xl min-h-[200px]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">MQ Series</h3>
                    <p className="text-xs text-gray-600 mt-0.5">Gas & Asap Detector</p>
                  </div>
                  <Wind className="w-5 h-5 text-teal-400" />
                </div>

                {/* MQ-135 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">MQ-135 (CO₂ / Air Quality)</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${mq135Status.bg}`} style={{ color: mq135Status.color }}>
                      {mq135Status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2.5 bg-[#0e1116] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(mq135 / 1000) * 100}%`, backgroundColor: mq135Status.color }}
                      />
                    </div>
                    <span className="text-sm font-mono font-bold text-gray-200 w-12 text-right tabular-nums">{mq135}</span>
                    <span className="text-xs text-gray-600">ppm</span>
                  </div>
                </div>

                {/* MQ-2 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">MQ-2 (Asap / LPG / Gas)</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${mq2Status.bg}`} style={{ color: mq2Status.color }}>
                      {mq2Status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2.5 bg-[#0e1116] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(mq2 / 800) * 100}%`, backgroundColor: mq2Status.color }}
                      />
                    </div>
                    <span className="text-sm font-mono font-bold text-gray-200 w-12 text-right tabular-nums">{mq2}</span>
                    <span className="text-xs text-gray-600">ppm</span>
                  </div>
                </div>
              </div>

            </div>
            {/* End Grid Anakan */}

            {/* ── Card Grid Induk (Lebar Penuh): Ringkasan Sistem ── */}
            <div className="bg-[#171c25] border border-gray-800 p-6 rounded-xl min-h-[250px]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Ringkasan Sistem</h3>
                  <p className="text-xs text-gray-600 mt-0.5">Status seluruh sensor & kondisi lingkungan</p>
                </div>
                <Gauge className="w-5 h-5 text-indigo-400" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                {/* Suhu */}
                <div className="bg-[#0e1116] rounded-xl p-4 flex flex-col items-center">
                  <GaugeArc value={dht22Temp} max={50} color="#60a5fa" />
                  <p className="text-2xl font-bold text-blue-300 tabular-nums -mt-2">{dht22Temp}°C</p>
                  <p className="text-xs text-gray-500 mt-1">Suhu</p>
                  <span className={`text-xs mt-1 flex items-center gap-1 ${dht22Temp > 30 ? 'text-orange-400' : 'text-emerald-400'}`}>
                    {dht22Temp > 30 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {dht22Temp > 30 ? 'Hangat' : 'Normal'}
                  </span>
                </div>

                {/* Kelembaban */}
                <div className="bg-[#0e1116] rounded-xl p-4 flex flex-col items-center">
                  <GaugeArc value={dht22Hum} max={100} color="#22d3ee" />
                  <p className="text-2xl font-bold text-cyan-300 tabular-nums -mt-2">{dht22Hum}%</p>
                  <p className="text-xs text-gray-500 mt-1">Kelembaban</p>
                  <span className={`text-xs mt-1 flex items-center gap-1 ${dht22Hum > 80 ? 'text-orange-400' : 'text-emerald-400'}`}>
                    {dht22Hum > 80 ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                    {dht22Hum > 80 ? 'Lembab' : 'Normal'}
                  </span>
                </div>

                {/* CO₂ */}
                <div className="bg-[#0e1116] rounded-xl p-4 flex flex-col items-center">
                  <GaugeArc value={mq135} max={1000} color={mq135Status.color} />
                  <p className="text-2xl font-bold tabular-nums -mt-2" style={{ color: mq135Status.color }}>{mq135}</p>
                  <p className="text-xs text-gray-500 mt-1">CO₂ (ppm)</p>
                  <span className="text-xs mt-1" style={{ color: mq135Status.color }}>{mq135Status.label}</span>
                </div>

                {/* Gas/Asap */}
                <div className="bg-[#0e1116] rounded-xl p-4 flex flex-col items-center">
                  <GaugeArc value={mq2} max={800} color={mq2Status.color} />
                  <p className="text-2xl font-bold tabular-nums -mt-2" style={{ color: mq2Status.color }}>{mq2}</p>
                  <p className="text-xs text-gray-500 mt-1">Gas (ppm)</p>
                  <span className="text-xs mt-1" style={{ color: mq2Status.color }}>{mq2Status.label}</span>
                </div>

              </div>

              {/* Footer card */}
              <div className="mt-5 pt-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-600">
                <span>Data diperbarui setiap 1.5 detik</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Streaming
                </span>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
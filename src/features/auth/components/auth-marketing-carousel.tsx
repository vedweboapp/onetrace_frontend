"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

// ─────────────────────────────────────────────
// Keyframe CSS
// ─────────────────────────────────────────────
const KEYFRAMES = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@300;400;500&display=swap');

  @keyframes gFloat    { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-10px)} }
  @keyframes blink     { 0%,100%{opacity:1}                 50%{opacity:.3}  }
  @keyframes pinPulse  { 0%,100%{r:10;opacity:.6}           50%{r:22;opacity:0} }
  @keyframes dashMove  { to{stroke-dashoffset:-200} }
  @keyframes scanBeam  { 0%{transform:translateY(0)} 100%{transform:translateY(400px)} }
  @keyframes scanLine  { 0%,100%{transform:translateY(0);opacity:.7}   50%{transform:translateY(-80px);opacity:1} }
  @keyframes vertScan  { 0%,100%{transform:translateX(0);opacity:.4}   50%{transform:translateX(60px);opacity:.9} }
  @keyframes rotateSlow{ to{transform:rotate(360deg)} }
  @keyframes statusBlink{ 0%,100%{opacity:1} 50%{opacity:.35} }
  @keyframes gridPulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes roomPulse { 0%,100%{opacity:1} 50%{opacity:.65} }
  @keyframes globeFloat{ 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes buildingFloat{ 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
  @keyframes ellipsePulse{ 0%,100%{opacity:.15;transform:scaleY(1)} 50%{opacity:.3;transform:scaleY(1.1)} }
  @keyframes thumbPulse{ 0%,100%{opacity:1} 50%{opacity:.6} }
  @keyframes pointPulse{ 0%,100%{r:3;opacity:1} 50%{r:5;opacity:.6} }
  @keyframes floatParticle{
    0%,100%{transform:translate(0,0);opacity:.25}
    25%{transform:translate(10px,-15px);opacity:.75}
    50%{transform:translate(-5px,-25px);opacity:.45}
    75%{transform:translate(-14px,-10px);opacity:.65}
  }
  @keyframes workerMove{
    0%,100%{transform:translate(0,0)}
    25%{transform:translate(15px,10px)}
    50%{transform:translate(25px,-5px)}
    75%{transform:translate(10px,-14px)}
  }
  @keyframes workerPulse{ 0%,100%{opacity:.3} 50%{opacity:0} }
  @keyframes craneSwing { 0%,100%{transform:rotate(-5deg)} 50%{transform:rotate(5deg)} }
  @keyframes fadeSlideUp{ from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideInLeft{ from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
  @keyframes borderPulse{ 0%,100%{opacity:.2} 50%{opacity:.5} }
`;

// ─────────────────────────────────────────────
// Reusable SVG atoms
// ─────────────────────────────────────────────
function Pin({
  cx, cy, label, delay = 0, color = "#e53e3e",
}: { cx: number; cy: number; label: string; delay?: number; color?: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={18} fill={`${color}40`}
        style={{ animation: `pinPulse 2.4s ease-in-out ${delay}s infinite` }} />
      <circle cx={cx} cy={cy} r={13} fill={color} />
      <circle cx={cx} cy={cy} r={9}  fill="rgba(0,0,0,.5)" />
      <text x={cx} y={cy + 4} textAnchor="middle"
        fontFamily="'Rajdhani',sans-serif" fontWeight="700" fontSize="9" fill="#fff">
        {label}
      </text>
    </g>
  );
}

function DataPacket({ path, duration, delay, color }: {
  path: string; duration: number; delay: number; color: string;
}) {
  return (
    <circle r={4} fill={color}>
      <animateMotion path={path} dur={`${duration}s`} begin={`${delay}s`} repeatCount="indefinite" rotate="auto" />
      <animate attributeName="opacity" values="0;1;1;0" dur={`${duration}s`} begin={`${delay}s`} repeatCount="indefinite" />
    </circle>
  );
}

function Worker({ cx, cy, delay }: { cx: number; cy: number; delay: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill="#fbbf24"
        style={{ animation: `workerMove 4s ease-in-out ${delay}s infinite` }} />
      <circle cx={cx} cy={cy} r={9} fill="none" stroke="rgba(251,191,36,.4)" strokeWidth={1}
        style={{ animation: `workerPulse 2s ease-in-out ${delay}s infinite` }} />
    </g>
  );
}

function InfoCard({ x, y, title, sub, status, statusColor, delay = 0 }: {
  x: number; y: number; title: string; sub: string;
  status: string; statusColor: string; delay?: number;
}) {
  return (
    <g style={{ animation: `fadeSlideUp .6s ease-out ${delay}s both` }}>
      <rect x={x} y={y} width={174} height={54} rx={4}
        fill="rgba(4,12,22,.92)" stroke="rgba(255,255,255,.12)" strokeWidth={1} />
      <rect x={x} y={y} width={174} height={54} rx={4}
        fill="none" stroke={statusColor} strokeWidth={1} opacity={.3}
        style={{ animation: `borderPulse 3s ease-in-out ${delay}s infinite` }} />
      <text x={x + 10} y={y + 17}
        fontFamily="'Rajdhani',sans-serif" fontWeight="600" fontSize="10" fill="#fff" letterSpacing=".6">
        {title}
      </text>
      <text x={x + 10} y={y + 31} fontFamily="'Inter',sans-serif" fontSize="9" fill="rgba(255,255,255,.45)">
        {sub}
      </text>
      <circle cx={x + 10} cy={y + 44} r={3} fill={statusColor}
        style={{ animation: `statusBlink 2s ease-in-out ${delay}s infinite` }} />
      <text x={x + 18} y={y + 47} fontFamily="'Rajdhani',sans-serif" fontSize="9" fill={statusColor}>
        {status}
      </text>
    </g>
  );
}

// ─────────────────────────────────────────────
// Scene 1 — Live Blueprint
// ─────────────────────────────────────────────
function Scene1() {
  return (
    <svg viewBox="0 0 520 360" width="100%" height="100%"
      xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <filter id="g1">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="scanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="rgba(0,220,200,0)" />
          <stop offset="50%"  stopColor="rgba(0,220,200,1)" />
          <stop offset="100%" stopColor="rgba(0,220,200,0)" />
        </linearGradient>
        <linearGradient id="roomGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="rgba(0,180,200,0.09)" />
          <stop offset="100%" stopColor="rgba(0,180,200,0.02)" />
        </linearGradient>
      </defs>

      {/* Grid */}
      {[52,104,156,208,260,312,364,416,468].map((x, i) => (
        <line key={`v${i}`} x1={x} y1={0} x2={x} y2={360}
          stroke="rgba(0,180,200,0.07)" strokeWidth={1}
          style={{ animation: `gridPulse 4s ease-in-out ${i * .2}s infinite` }} />
      ))}
      {[40,80,120,160,200,240,280,320].map((y, i) => (
        <line key={`h${i}`} x1={0} y1={y} x2={520} y2={y}
          stroke="rgba(0,180,200,0.07)" strokeWidth={1}
          style={{ animation: `gridPulse 4s ease-in-out ${i * .3}s infinite` }} />
      ))}

      {/* Floating particles */}
      {[
        [80,70,0],[160,130,.8],[250,60,1.6],[340,90,2.4],
        [420,150,3.2],[470,70,.4],[70,250,1.2],[180,290,2],
      ].map(([x,y,d],i) => (
        <circle key={i} cx={x} cy={y} r={1.5} fill="rgba(0,220,200,.6)"
          style={{ animation: `floatParticle 6s ease-in-out ${d}s infinite` }} />
      ))}

      {/* Rooms */}
      <rect x={48}  y={55}  width={175} height={120} fill="url(#roomGrad)" stroke="rgba(0,200,220,.45)" strokeWidth={1.5} style={{ animation: "roomPulse 5s ease-in-out infinite" }} />
      <rect x={238} y={55}  width={130} height={80}  fill="url(#roomGrad)" stroke="rgba(0,200,220,.45)" strokeWidth={1.5} style={{ animation: "roomPulse 5s ease-in-out .5s infinite" }} />
      <rect x={380} y={55}  width={100} height={120} fill="rgba(20,60,40,.3)"  stroke="rgba(0,200,220,.45)" strokeWidth={1.5} style={{ animation: "roomPulse 5s ease-in-out 1s infinite" }} />
      <rect x={48}  y={194} width={115} height={140} fill="url(#roomGrad)" stroke="rgba(0,200,220,.45)" strokeWidth={1.5} style={{ animation: "roomPulse 5s ease-in-out 1.5s infinite" }} />
      <rect x={178} y={194} width={185} height={140} fill="rgba(60,40,10,.25)" stroke="rgba(200,160,0,.4)"  strokeWidth={1.5} style={{ animation: "roomPulse 5s ease-in-out 2s infinite" }} />
      <rect x={376} y={194} width={104} height={140} fill="rgba(60,40,10,.25)" stroke="rgba(200,160,0,.4)"  strokeWidth={1.5} style={{ animation: "roomPulse 5s ease-in-out 2.5s infinite" }} />

      {/* Connection paths */}
      <polyline points="120,248 188,165 305,114 432,132" fill="none" stroke="rgba(0,220,200,.75)" strokeWidth={2} strokeDasharray="12 6" filter="url(#g1)" style={{ animation: "dashMove 3s linear infinite" }} />
      <polyline points="80,275 155,225 284,205 428,262"  fill="none" stroke="rgba(237,137,54,.6)"  strokeWidth={1.5} strokeDasharray="8 4"  filter="url(#g1)" style={{ animation: "dashMove 4s linear infinite reverse" }} />
      <polyline points="65,95 135,115 204,95 304,106 384,84" fill="none" stroke="rgba(72,187,120,.5)" strokeWidth={1.5} strokeDasharray="6 4"  filter="url(#g1)" style={{ animation: "dashMove 5s linear infinite" }} />

      {/* Data packets */}
      <DataPacket path="M120,248 L188,165 L305,114 L432,132" duration={3} delay={0}   color="#4fd1c5" />
      <DataPacket path="M120,248 L188,165 L305,114 L432,132" duration={3} delay={1.5} color="#4fd1c5" />
      <DataPacket path="M80,275 L155,225 L284,205 L428,262"  duration={4} delay={.5}  color="#ed8936" />
      <DataPacket path="M65,95 L135,115 L204,95 L304,106 L384,84" duration={5} delay={0} color="#48bb78" />

      {/* Workers */}
      <Worker cx={100} cy={114} delay={0} />
      <Worker cx={204} cy={245} delay={1} />
      <Worker cx={325} cy={275} delay={2} />

      {/* Pins */}
      <Pin cx={120} cy={248} label="01" delay={0} />
      <Pin cx={188} cy={278} label="02" delay={.4} color="#ed8936" />
      <Pin cx={305} cy={110} label="03" delay={.8} color="#48bb78" />
      <Pin cx={432} cy={128} label="04" delay={.2} />

      {/* Scan beam */}
      <rect x={0} y={0} width={520} height={4} fill="url(#scanGrad)"
        style={{ animation: "scanBeam 4s linear infinite" }} />

      {/* Info cards */}
      <InfoCard x={168} y={64}  title="STRUCTURAL SURVEY" sub="Zone 11-12 Integrity Check" status="ONGOING"  statusColor="#4fd1c5" delay={.2} />
      <InfoCard x={264} y={14}  title="HVAC INSTALL"       sub="Unit 7 · Progress 65%"    status="PROGRESS" statusColor="#48bb78" delay={.4} />
      <InfoCard x={4}   y={206} title="ELECTRICAL LAYOUT"  sub="Floor 3 · Wiring Plan"    status="PLAN"     statusColor="rgba(255,255,255,.55)" delay={.6} />
      <InfoCard x={220} y={286} title="FOUNDATION REBARS"  sub="Inspection Needed"         status="WARN"     statusColor="#ed8936" delay={.8} />

      {/* Crane */}
      <g transform="translate(480,340)">
        <rect x={-8} y={0} width={16} height={6} fill="#4a5568" />
        <rect x={-3} y={-60} width={6} height={60} fill="#718096" />
        <g style={{ transformOrigin: "0px -60px", animation: "craneSwing 8s ease-in-out infinite" }}>
          <rect x={-2} y={-64} width={80} height={4} fill="#ed8936" transform="rotate(-15)" />
          <line x1={60} y1={-62} x2={60} y2={-30} stroke="#a0aec0" strokeWidth={1} />
          <rect x={56} y={-32} width={8} height={8} fill="#4a5568" />
        </g>
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────
// Scene 2 — Projects Overview + Globe
// ─────────────────────────────────────────────
function Scene2() {
  const projects = [
    { name: "SKY TOWER ALPHA",  status: "ON TRACK",           sc: "#48bb78", issues: 4,   pins: 218, pct: 68 },
    { name: "RED 5 RESIDENCE",  status: "INSPECTION PENDING", sc: "#ed8936", issues: 17,  pins: 92,  pct: 45 },
    { name: "CITY CENTER MALL", status: "ACTION NEEDED",      sc: "#e53e3e", issues: "31",pins: 154, pct: 74 },
  ];

  return (
    <svg viewBox="0 0 520 360" width="100%" height="100%"
      xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <filter id="gg">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="globG" cx="40%" cy="40%">
          <stop offset="0%"   stopColor="rgba(0,200,220,.14)" />
          <stop offset="100%" stopColor="rgba(0,200,220,.02)" />
        </radialGradient>
      </defs>

      {/* Project cards */}
      {projects.map((p, i) => {
        const yy = 14 + i * 108;
        const barW = (235 * p.pct) / 100;
        return (
          <g key={i} style={{ animation: `slideInLeft .6s ease-out ${i * .15}s both` }}>
            <rect x={16} y={yy} width={255} height={96} rx={5} fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.08)" strokeWidth={1} />
            <rect x={16} y={yy} width={255} height={96} rx={5} fill="none" stroke={p.sc} strokeWidth={1} opacity={.3}
              style={{ animation: `borderPulse 3s ease-in-out ${i * .5}s infinite` }} />
            {/* Thumbnail */}
            <rect x={24} y={yy + 8} width={56} height={44} rx={3} fill="rgba(0,150,180,.14)" stroke="rgba(0,200,220,.28)" strokeWidth={1}
              style={{ animation: `thumbPulse 4s ease-in-out ${i * .3}s infinite` }} />
            <line x1={28} y1={yy + 20} x2={76} y2={yy + 20} stroke="rgba(0,200,220,.18)" strokeWidth={.5} />
            <line x1={28} y1={yy + 32} x2={76} y2={yy + 32} stroke="rgba(0,200,220,.18)" strokeWidth={.5} />
            <line x1={52} y1={yy + 12} x2={52} y2={yy + 48} stroke="rgba(0,200,220,.18)" strokeWidth={.5} />
            <text x={52} y={yy + 34} fontFamily="'Inter',sans-serif" fontSize={8} fill="rgba(0,200,220,.55)" textAnchor="middle">PLAN</text>
            {/* Name + status */}
            <text x={90} y={yy + 22} fontFamily="'Rajdhani',sans-serif" fontWeight="700" fontSize={11} fill="white" letterSpacing=".7">{p.name}</text>
            <circle cx={90} cy={yy + 33} r={3.5} fill={p.sc} style={{ animation: `statusBlink 2s ease-in-out ${i * .2}s infinite` }} />
            <text x={98} y={yy + 37} fontFamily="'Rajdhani',sans-serif" fontSize={9} fill={p.sc}>{p.status}</text>
            {/* Stats */}
            <text x={90}  y={yy + 54} fontFamily="'Inter',sans-serif" fontSize={8} fill="rgba(255,255,255,.35)">Issues:</text>
            <text x={90}  y={yy + 66} fontFamily="'Rajdhani',sans-serif" fontWeight="600" fontSize={12} fill={i === 2 ? "#e53e3e" : "white"}>{p.issues}</text>
            <text x={148} y={yy + 54} fontFamily="'Inter',sans-serif" fontSize={8} fill="rgba(255,255,255,.35)">Pins:</text>
            <text x={148} y={yy + 66} fontFamily="'Rajdhani',sans-serif" fontWeight="600" fontSize={12} fill="white">{p.pins}</text>
            <text x={204} y={yy + 54} fontFamily="'Inter',sans-serif" fontSize={8} fill="rgba(255,255,255,.35)">Done:</text>
            <text x={204} y={yy + 66} fontFamily="'Rajdhani',sans-serif" fontWeight="600" fontSize={12} fill="white">{p.pct}%</text>
            {/* Progress bar */}
            <rect x={24} y={yy + 80} width={235} height={4} rx={2} fill="rgba(255,255,255,.07)" />
            <rect x={24} y={yy + 80} width={0}   height={4} rx={2} fill={p.sc}>
              <animate attributeName="width" from="0" to={barW} dur="1.5s" begin={`${.3 + i * .2}s`} fill="freeze" />
            </rect>
          </g>
        );
      })}

      {/* Globe */}
      <g style={{ animation: "globeFloat 6s ease-in-out infinite" }}>
        <circle cx={400} cy={190} r={104} fill="url(#globG)" filter="url(#gg)" />
        <circle cx={400} cy={190} r={90}  fill="none" stroke="rgba(0,200,220,.22)" strokeWidth={2}
          style={{ animation: "rotateSlow 20s linear infinite", transformOrigin: "400px 190px" }} />
        <circle cx={400} cy={190} r={72}  fill="none" stroke="rgba(0,200,220,.11)" strokeWidth={1}
          style={{ animation: "rotateSlow 15s linear infinite reverse", transformOrigin: "400px 190px" }} />
        <circle cx={400} cy={190} r={52}  fill="none" stroke="rgba(0,200,220,.07)" strokeWidth={1}
          style={{ animation: "rotateSlow 25s linear infinite", transformOrigin: "400px 190px" }} />
        <ellipse cx={400} cy={190} rx={90} ry={30} fill="none" stroke="rgba(0,200,220,.13)" strokeWidth={1}
          style={{ animation: "ellipsePulse 4s ease-in-out infinite" }} />
        <line x1={400} y1={100} x2={400} y2={280} stroke="rgba(0,200,220,.11)" strokeWidth={1} />
        <line x1={310} y1={190} x2={490} y2={190} stroke="rgba(0,200,220,.11)" strokeWidth={1} />
        <line x1={340} y1={130} x2={460} y2={250} stroke="rgba(0,200,220,.07)" strokeWidth={1} />
        <line x1={460} y1={130} x2={340} y2={250} stroke="rgba(0,200,220,.07)" strokeWidth={1} />
      </g>

      {/* Globe pins */}
      <Pin cx={358} cy={202} label="01" delay={0}   />
      <Pin cx={400} cy={152} label="02" delay={.5}  color="#48bb78" />
      <Pin cx={442} cy={170} label="03" delay={1.0} color="#ed8936" />
      <Pin cx={452} cy={224} label="04" delay={1.5} />

      {/* Globe arcs */}
      <path d="M358,202 Q380,142 400,152" fill="none" stroke="rgba(0,220,200,.48)"  strokeWidth={1.5} strokeDasharray="5 4" style={{ animation: "dashMove 4s linear infinite" }} />
      <path d="M400,152 Q424,158 442,170" fill="none" stroke="rgba(72,187,120,.48)" strokeWidth={1.5} strokeDasharray="5 4" style={{ animation: "dashMove 4s linear infinite reverse" }} />
      <path d="M442,170 Q450,198 452,224" fill="none" stroke="rgba(237,137,54,.48)" strokeWidth={1.5} strokeDasharray="5 4" style={{ animation: "dashMove 3s linear infinite" }} />
      <DataPacket path="M358,202 Q380,142 400,152" duration={2} delay={0}   color="#4fd1c5" />
      <DataPacket path="M400,152 Q424,158 442,170" duration={2} delay={.5}  color="#48bb78" />
      <DataPacket path="M442,170 Q450,198 452,224" duration={2} delay={1.0} color="#ed8936" />

      {/* Stat tiles */}
      <g style={{ animation: "fadeSlideUp .8s ease-out .5s both" }}>
        <rect x={306} y={300} width={90} height={44} rx={4} fill="rgba(0,0,0,.45)" stroke="rgba(255,255,255,.07)" strokeWidth={1} />
        <text x={314} y={315} fontFamily="'Inter',sans-serif" fontSize={9} fill="rgba(255,255,255,.35)">TOTAL PROJECTS:</text>
        <text x={314} y={335} fontFamily="'Rajdhani',sans-serif" fontWeight="700" fontSize={20} fill="white">15</text>
        <circle cx={380} cy={324} r={4} fill="#48bb78" style={{ animation: "statusBlink 2s ease-in-out infinite" }} />
      </g>
      <g style={{ animation: "fadeSlideUp .8s ease-out .7s both" }}>
        <rect x={404} y={300} width={88} height={44} rx={4} fill="rgba(0,0,0,.45)" stroke="rgba(255,255,255,.07)" strokeWidth={1} />
        <text x={412} y={315} fontFamily="'Inter',sans-serif" fontSize={9} fill="rgba(255,255,255,.35)">ACTIVE USERS:</text>
        <text x={412} y={335} fontFamily="'Rajdhani',sans-serif" fontWeight="700" fontSize={20} fill="white">74</text>
        <circle cx={474} cy={324} r={4} fill="#4fd1c5" style={{ animation: "statusBlink 2s ease-in-out .5s infinite" }} />
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────
// Scene 3 — Isometric + Live Charts
// ─────────────────────────────────────────────
function Scene3() {
  return (
    <svg viewBox="0 0 520 360" width="100%" height="100%"
      xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <filter id="sg">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="ig1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="rgba(0,80,100,.42)" />
          <stop offset="100%" stopColor="rgba(0,40,60,.2)" />
        </linearGradient>
        <linearGradient id="ig2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="rgba(0,60,80,.36)" />
          <stop offset="100%" stopColor="rgba(0,30,50,.14)" />
        </linearGradient>
      </defs>

      {/* Isometric building */}
      <g style={{ animation: "buildingFloat 8s ease-in-out infinite" }}>
        <polygon points="250,55 400,135 400,295 250,375 100,295 100,135"
          fill="none" stroke="rgba(0,200,220,.38)" strokeWidth={2} />
        <polygon points="250,220 400,295 250,375 100,295"
          fill="url(#ig1)" stroke="rgba(0,200,220,.28)" strokeWidth={1} />
        <polygon points="100,135 250,55 250,220 100,295"
          fill="url(#ig2)" stroke="rgba(0,200,220,.22)" strokeWidth={1} />
        <polygon points="400,135 250,55 250,220 400,295"
          fill="url(#ig2)" stroke="rgba(0,200,220,.22)" strokeWidth={1} />
        <line x1={250} y1={55}  x2={250} y2={375} stroke="rgba(0,200,220,.16)" strokeWidth={1}
          style={{ animation: "gridPulse 3s ease-in-out infinite" }} />
        <line x1={175} y1={95}  x2={325} y2={175} stroke="rgba(0,200,220,.1)"  strokeWidth={1}
          style={{ animation: "gridPulse 3s ease-in-out .5s infinite" }} />
        <line x1={175} y1={255} x2={325} y2={335} stroke="rgba(0,200,220,.1)"  strokeWidth={1}
          style={{ animation: "gridPulse 3s ease-in-out 1s infinite" }} />
        <line x1={100} y1={175} x2={400} y2={175} stroke="rgba(0,200,220,.08)" strokeWidth={1} strokeDasharray="4 4" />
        <line x1={100} y1={215} x2={400} y2={215} stroke="rgba(0,200,220,.08)" strokeWidth={1} strokeDasharray="4 4" />
        <line x1={100} y1={255} x2={400} y2={255} stroke="rgba(0,200,220,.08)" strokeWidth={1} strokeDasharray="4 4" />
      </g>

      {/* Scan lines */}
      <line x1={100} y1={215} x2={400} y2={215} stroke="rgba(79,209,197,.7)"   strokeWidth={2}   strokeDasharray="8 4" filter="url(#sg)" style={{ animation: "scanLine 3s ease-in-out infinite" }} />
      <line x1={100} y1={175} x2={400} y2={175} stroke="rgba(72,187,120,.5)"   strokeWidth={1.5} strokeDasharray="6 3" filter="url(#sg)" style={{ animation: "scanLine 4s ease-in-out 1s infinite reverse" }} />
      <line x1={250} y1={55}  x2={250} y2={375} stroke="rgba(237,137,54,.38)"  strokeWidth={2}   strokeDasharray="10 5" filter="url(#sg)" style={{ animation: "vertScan 5s ease-in-out infinite" }} />

      {/* Pins */}
      <Pin cx={172} cy={262} label="01" delay={0}   />
      <Pin cx={250} cy={150} label="02" delay={.4}  color="#48bb78" />
      <Pin cx={205} cy={210} label="03" delay={.8}  color="#ed8936" />
      <Pin cx={330} cy={228} label="04" delay={1.2} />
      <Pin cx={288} cy={282} label="05" delay={1.6} color="#4fd1c5" />

      {/* Connection path + packets */}
      <polyline points="172,262 250,150 205,210 330,228 288,282"
        fill="none" stroke="rgba(0,220,200,.58)" strokeWidth={1.5} strokeDasharray="8 4"
        filter="url(#sg)" style={{ animation: "dashMove 5s linear infinite" }} />
      <DataPacket path="M172,262 L250,150 L205,210 L330,228 L288,282" duration={4} delay={0} color="#4fd1c5" />
      <DataPacket path="M172,262 L250,150 L205,210 L330,228 L288,282" duration={4} delay={2} color="#48bb78" />

      {/* Workers */}
      <Worker cx={185} cy={242} delay={0} />
      <Worker cx={308} cy={262} delay={1.5} />

      {/* Chart — top-left */}
      <g style={{ animation: "fadeSlideUp .6s ease-out 0s both" }}>
        <rect x={8} y={8} width={145} height={80} rx={4} fill="rgba(0,0,0,.52)" stroke="rgba(0,200,220,.16)" strokeWidth={1} />
        <text x={14} y={23} fontFamily="'Rajdhani',sans-serif" fontSize={9} fill="rgba(255,255,255,.45)" letterSpacing={1}>MATERIAL USAGE</text>
        <polyline points="16,68 34,52 54,58 74,38 94,44 114,26 138,30"
          fill="none" stroke="rgba(0,200,220,.85)" strokeWidth={2}
          strokeDasharray={200} strokeDashoffset={200}>
          <animate attributeName="stroke-dashoffset" from="200" to="0" dur="2s" fill="freeze" />
        </polyline>
        <polyline points="16,72 34,60 54,65 74,50 94,55 114,40 138,46"
          fill="none" stroke="rgba(237,137,54,.75)" strokeWidth={2}
          strokeDasharray={200} strokeDashoffset={200}>
          <animate attributeName="stroke-dashoffset" from="200" to="0" dur="2s" begin=".3s" fill="freeze" />
        </polyline>
        <circle cx={138} cy={30} r={3} fill="#4fd1c5" style={{ animation: "pointPulse 2s ease-in-out infinite" }} />
        <circle cx={138} cy={46} r={3} fill="#ed8936" style={{ animation: "pointPulse 2s ease-in-out .5s infinite" }} />
        <circle cx={16} cy={86} r={3} fill="rgba(0,200,220,.85)" />
        <text x={22} y={89} fontFamily="'Inter',sans-serif" fontSize={8} fill="rgba(255,255,255,.45)">HVAC 66%</text>
        <circle cx={82} cy={86} r={3} fill="rgba(237,137,54,.75)" />
        <text x={88} y={89} fontFamily="'Inter',sans-serif" fontSize={8} fill="rgba(255,255,255,.45)">Elec 74%</text>
      </g>

      {/* Chart — top-right */}
      <g style={{ animation: "fadeSlideUp .6s ease-out .2s both" }}>
        <rect x={368} y={8} width={144} height={80} rx={4} fill="rgba(0,0,0,.52)" stroke="rgba(0,200,220,.16)" strokeWidth={1} />
        <text x={374} y={23} fontFamily="'Rajdhani',sans-serif" fontSize={9} fill="rgba(255,255,255,.45)" letterSpacing={1}>SITE PROGRESS</text>
        <polyline points="374,68 392,60 408,55 428,42 446,36 464,28 504,22"
          fill="none" stroke="rgba(72,187,120,.85)" strokeWidth={2}
          strokeDasharray={200} strokeDashoffset={200}>
          <animate attributeName="stroke-dashoffset" from="200" to="0" dur="2s" begin=".5s" fill="freeze" />
        </polyline>
        <circle cx={504} cy={22} r={3} fill="#48bb78" style={{ animation: "pointPulse 2s ease-in-out infinite" }} />
        <rect x={374} y={80} width={0} height={6} rx={2} fill="rgba(72,187,120,.7)">
          <animate attributeName="width" from="0" to="82" dur="1.5s" begin=".8s" fill="freeze" />
        </rect>
        <text x={464} y={87} fontFamily="'Inter',sans-serif" fontSize={8} fill="rgba(255,255,255,.45)">Concrete 82%</text>
      </g>

      {/* Stat badges */}
      <g style={{ animation: "fadeSlideUp .6s ease-out .4s both" }}>
        <rect x={8} y={284} width={115} height={44} rx={4} fill="rgba(0,0,0,.55)" stroke="rgba(79,209,197,.38)" strokeWidth={1} />
        <text x={16} y={300} fontFamily="'Inter',sans-serif" fontSize={8} fill="rgba(255,255,255,.42)">ACTIVE WORKERS</text>
        <text x={16} y={318} fontFamily="'Rajdhani',sans-serif" fontWeight="700" fontSize={18} fill="#4fd1c5">247</text>
        <circle cx={102} cy={306} r={5} fill="#48bb78" style={{ animation: "pinPulse 1.8s ease-in-out infinite" }} />
        <text x={58} y={318} fontFamily="'Inter',sans-serif" fontSize={8} fill="rgba(72,187,120,.8)">+12 today</text>
      </g>
      <g style={{ animation: "fadeSlideUp .6s ease-out .6s both" }}>
        <rect x={130} y={284} width={115} height={44} rx={4} fill="rgba(0,0,0,.55)" stroke="rgba(237,137,54,.38)" strokeWidth={1} />
        <text x={138} y={300} fontFamily="'Inter',sans-serif" fontSize={8} fill="rgba(255,255,255,.42)">PENDING TASKS</text>
        <text x={138} y={318} fontFamily="'Rajdhani',sans-serif" fontWeight="700" fontSize={18} fill="#ed8936">38</text>
        <circle cx={218} cy={306} r={5} fill="#ed8936" style={{ animation: "pinPulse 1.8s ease-in-out .3s infinite" }} />
      </g>

      {/* Crane */}
      <g transform="translate(480,345)">
        <rect x={-8} y={0} width={16} height={6} fill="#4a5568" />
        <rect x={-3} y={-60} width={6} height={60} fill="#718096" />
        <g style={{ transformOrigin: "0px -60px", animation: "craneSwing 8s ease-in-out infinite" }}>
          <rect x={-2} y={-64} width={80} height={4} fill="#ed8936" transform="rotate(-10)" />
          <line x1={60} y1={-62} x2={60} y2={-30} stroke="#a0aec0" strokeWidth={1} />
          <rect x={56} y={-32} width={8} height={8} fill="#4a5568" />
        </g>
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────
// Slide definitions
// ─────────────────────────────────────────────
const SLIDES = [
  {
    badge: "Live Site Sync",
    titleLine1Key: "heroTitleLine1" as const,
    titleLine2Key: "heroTitleLine2" as const,
    subtitleKey:   "heroSubtitle"   as const,
    Scene: Scene1,
  },
  {
    badge: "15 Active Projects",
    titleLine1Key: "heroTitleLine1" as const,
    titleLine2Key: "heroTitleLine2" as const,
    subtitleKey:   "heroSubtitle"   as const,
    Scene: Scene2,
  },
  {
    badge: "Live Data Feed",
    titleLine1Key: "heroTitleLine1" as const,
    titleLine2Key: "heroTitleLine2" as const,
    subtitleKey:   "heroSubtitle"   as const,
    Scene: Scene3,
  },
];

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export function AuthMarketingCarousel() {
  const t = useTranslations("Auth");
  const [active, setActive] = React.useState(0);
  const [transitioning, setTransitioning] = React.useState(false);

  // Auto-advance every 6 s
  React.useEffect(() => {
    const id = window.setInterval(() => {
      setTransitioning(true);
      window.setTimeout(() => {
        setActive((p) => (p + 1) % SLIDES.length);
        setTransitioning(false);
      }, 450);
    }, 6000);
    return () => window.clearInterval(id);
  }, []);

  const goTo = (i: number) => {
    if (i === active) return;
    setTransitioning(true);
    window.setTimeout(() => {
      setActive(i);
      setTransitioning(false);
    }, 450);
  };

  const { badge, Scene } = SLIDES[active];

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden bg-[#060a10]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <style>{KEYFRAMES}</style>

      {/* ── Layered backgrounds ── */}
      {/* Main grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(0,200,180,0.055) 1px,transparent 1px),linear-gradient(90deg,rgba(0,200,180,0.055) 1px,transparent 1px)",
        backgroundSize: "52px 52px",
        pointerEvents: "none", zIndex: 0,
      }} />
      {/* Vignette */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at center,transparent 20%,rgba(0,0,0,.85) 100%)",
        pointerEvents: "none", zIndex: 1,
      }} />
      {/* Scanlines */}
      <div style={{
        position: "absolute", inset: 0,
        background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,200,0.012) 2px,rgba(0,255,200,0.012) 4px)",
        pointerEvents: "none", zIndex: 2,
      }} />
      {/* Ambient glows */}
      <div style={{
        position: "absolute", width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle,rgba(0,200,220,.07) 0%,transparent 70%)",
        top: "-5%", left: "-8%", pointerEvents: "none", zIndex: 1,
        animation: "gFloat 10s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", width: 300, height: 300, borderRadius: "50%",
        background: "radial-gradient(circle,rgba(237,137,54,.05) 0%,transparent 70%)",
        bottom: "10%", right: 0, pointerEvents: "none", zIndex: 1,
        animation: "gFloat 12s ease-in-out 3s infinite",
      }} />

      {/* ── Top bar ── */}
      <div className="relative flex items-center gap-2.5 px-5 sm:px-8 py-5 sm:py-6" style={{ zIndex: 10 }}>
        <span
          className="flex h-9 w-9 items-center justify-center rounded-md bg-red-500 text-[13px] text-white flex-shrink-0"
          style={{ fontWeight: 900, letterSpacing: ".05em", boxShadow: "0 0 22px rgba(229,62,62,.45)" }}
        >
          R5
        </span>
        <span className="text-[15px] text-white" style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, letterSpacing: ".08em" }}>
          RED 5
        </span>

        {/* Live badge — key forces re-mount animation on slide change */}
        <span
          key={badge}
          className="ml-auto flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-[11px] sm:text-[12px] text-white/65"
          style={{ background: "rgba(255,255,255,.07)", backdropFilter: "blur(8px)" }}
        >
          <span
            className="h-2 w-2 rounded-full bg-emerald-400 inline-block"
            style={{ animation: "blink 2s ease-in-out infinite", boxShadow: "0 0 8px rgba(52,211,153,.7)" }}
          />
          {badge}
        </span>
      </div>

      {/* ── Headline ── */}
      <div className="relative px-5 sm:px-8 pt-1" style={{ zIndex: 10 }}>
        <div className="max-w-xl">
          <h1
            className="text-white"
            style={{
              fontSize: "clamp(24px,2.8vw,40px)",
              fontWeight: 800,
              lineHeight: 1.12,
              letterSpacing: "-.02em",
              fontFamily: "'Rajdhani',sans-serif",
            }}
          >
            {t("heroTitleLine1")}
            <br />
            <span style={{ color: "#94a3b8", fontWeight: 700 }}>
              {t("heroTitleLine2")}
            </span>
          </h1>
          <p
            className="mt-3 text-white/55 max-w-md"
            style={{ fontSize: "clamp(12px,1vw,14px)", fontWeight: 400, lineHeight: 1.6 }}
          >
            {t("heroSubtitle")}
          </p>
        </div>
      </div>

      {/* ── SVG Scene ── */}
      <div
        className="relative mx-4 sm:mx-5 mt-5 sm:mt-6 flex-1 overflow-hidden rounded-xl border border-white/[0.1]"
        style={{
          zIndex: 10,
          boxShadow: "0 0 50px rgba(0,200,220,.07),inset 0 0 70px rgba(0,0,0,.35)",
        }}
      >
        {/* Corner brackets */}
        {["tl","tr","bl","br"].map((pos) => (
          <div key={pos} style={{
            position: "absolute",
            width: 16, height: 16, zIndex: 8, pointerEvents: "none",
            ...(pos === "tl" ? { top: 8, left: 8,  borderTop: "1px solid rgba(0,220,200,.4)", borderLeft:  "1px solid rgba(0,220,200,.4)" } : {}),
            ...(pos === "tr" ? { top: 8, right: 8,  borderTop: "1px solid rgba(0,220,200,.4)", borderRight: "1px solid rgba(0,220,200,.4)" } : {}),
            ...(pos === "bl" ? { bottom: 8, left: 8,  borderBottom: "1px solid rgba(0,220,200,.4)", borderLeft:  "1px solid rgba(0,220,200,.4)" } : {}),
            ...(pos === "br" ? { bottom: 8, right: 8, borderBottom: "1px solid rgba(0,220,200,.4)", borderRight: "1px solid rgba(0,220,200,.4)" } : {}),
          }} />
        ))}

        {/* Scene (fades on transition) */}
        <div style={{
          position: "absolute", inset: 0,
          opacity: transitioning ? 0 : 1,
          transform: transitioning ? "scale(1.03)" : "scale(1)",
          transition: "opacity .45s ease, transform .45s ease",
        }}>
          <Scene />
        </div>

        {/* Bottom gradient overlay */}
        <div className="pointer-events-none absolute inset-0" style={{
          background: "linear-gradient(to top,#060a10 0%,rgba(6,10,16,.15) 30%,transparent 100%)",
          zIndex: 5,
        }} />
        {/* Corner vignette */}
        <div className="pointer-events-none absolute inset-0" style={{
          background: "linear-gradient(135deg,rgba(6,10,16,.55) 0%,transparent 45%)",
          zIndex: 5,
        }} />
      </div>

      {/* ── Dots navigation ── */}
      <div className="relative flex items-center gap-2.5 px-5 sm:px-8 py-4 sm:py-5" style={{ zIndex: 10 }}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
            style={{
              height: 5,
              width: i === active ? 30 : 6,
              borderRadius: 9999,
              background: i === active ? "#22d3ee" : "rgba(255,255,255,.2)",
              boxShadow: i === active ? "0 0 14px rgba(34,211,238,.5)" : "none",
              transition: "all .4s ease",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          />
        ))}
        <span
          className="ml-auto text-[11px] text-white/35"
          style={{ fontFamily: "'Rajdhani',sans-serif", letterSpacing: ".1em" }}
        >
          {String(active + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
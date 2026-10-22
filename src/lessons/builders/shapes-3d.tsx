import { useEffect, useRef, useState } from 'react';
import { Box, CircleDot, Hand, Rotate3d, Spline, Square } from 'lucide-react';
import type { Lesson, Question } from '../types';
import { C } from '../../lib/color';
import { numberChoices, pick, shuffle } from '../../lib/random';
import { play } from '../../lib/sound';
import { clamp, useSvgDrag } from '../../lib/svg';
import type { Pt } from '../../lib/svg';
import { Callout } from '../../stage/Callout';
import { SceneSvg, SvgButton } from '../../stage/widgets';
import { SOLIDS, SolidPicture, SolidView, project, solid } from './visuals/Solid';
import type { SolidDef, SolidId } from './visuals/Solid';

const CX = 455;
const CY = 330;

function facesText(d: SolidDef) {
  if (!d.curved) return String(d.flat);
  if (!d.flat) return '1 curved';
  return `${d.flat} flat + 1 curved`;
}

/** Where to point the face and corner callouts for the current view. */
function anchors(def: SolidDef, yaw: number, pitch: number, scale: number) {
  if (def.sphere) {
    const r = scale * 0.95;
    return { face: [CX - r * 0.55, CY - r * 0.55] as [number, number], point: [CX + r * 0.97, CY + r * 0.2] as [number, number], pointKind: 'none' as const, faceCurved: true };
  }
  const p = project(def, yaw, pitch, CX, CY, scale);
  const visible = p.faces.filter((f) => f.visible);
  const flat = visible.filter((f) => !f.curved).sort((a, b) => b.facing - a.facing)[0];
  const face = (flat ?? [...visible].sort((a, b) => b.facing - a.facing)[0]).center;
  if (def.corners.length) {
    const front = [...def.corners].sort((a, b) => p.pts[b][2] - p.pts[a][2])[0];
    return { face, point: [p.pts[front][0], p.pts[front][1]] as [number, number], pointKind: 'corner' as const, faceCurved: !flat };
  }
  // No corners (cylinder): point at the front of the top rim, which is an edge.
  const n = def.verts.length / 2;
  const rim = Array.from({ length: n }, (_, i) => i).sort((a, b) => p.pts[b][2] - p.pts[a][2])[0];
  return { face, point: [p.pts[rim][0], p.pts[rim][1]] as [number, number], pointKind: 'edge' as const, faceCurved: !flat };
}

function ShapesScene() {
  const [id, setId] = useState<SolidId>('cube');
  const [yaw, setYaw] = useState(0.6);
  const [pitch, setPitch] = useState(0.42);
  const [spin, setSpin] = useState(false);
  const [show, setShow] = useState({ faces: false, edges: false, corners: false });
  const last = useRef<Pt | null>(null);
  const def = solid(id);
  const scale = id === 'cuboid' ? 125 : 145;

  const drag = useSvgDrag(
    (p) => {
      const l = last.current;
      last.current = p;
      if (!l) return;
      setYaw((y) => y + (p.x - l.x) * 0.012);
      setPitch((v) => clamp(v + (p.y - l.y) * 0.012, -1.3, 1.3));
    },
    {
      onStart: (p) => {
        last.current = p;
        setSpin(false);
      },
      onEnd: () => {
        last.current = null;
      },
    },
  );

  // Q / E turn the shape, like the controls on a 3D viewer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Synthetic events can target window, which has no closest().
      const t = e.target instanceof Element ? e.target : document.body;
      if (t.closest('input, textarea, select, [contenteditable]') || document.querySelector('[role="dialog"]') || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k !== 'q' && k !== 'e') return;
      e.preventDefault();
      setSpin(false);
      setYaw((y) => y + (k === 'e' ? 0.26 : -0.26));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!spin) return;
    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      setYaw((y) => y + (now - prev) * 0.0007);
      prev = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [spin]);

  const a = anchors(def, yaw, pitch, scale);
  const toggle = (k: keyof typeof show) => setShow((s) => ({ ...s, [k]: !s[k] }));
  const rows: [string, string][] = [
    ['Faces', facesText(def)],
    ['Edges', String(def.edges)],
    ['Corners', String(def.vertices)],
    ['Can it roll?', def.rolls ? 'Yes!' : 'No'],
  ];

  return (
    <SceneSvg label={`A ${def.name.toLowerCase()} you can turn around`}>
      {/* Shape picker */}
      {SOLIDS.map((s, i) => (
        <SvgButton
          key={s.id}
          x={46}
          y={92 + i * 72}
          w={156}
          h={56}
          fontSize={20}
          label={s.name}
          active={s.id === id}
          color={s.id === id ? s.color : C.card}
          textColor={s.id === id && s.id !== 'cone' ? C.white : C.ink}
          onClick={() => {
            setId(s.id);
            play('pop');
          }}
        />
      ))}

      <g key={id} className="pop-in" style={{ transformOrigin: `${CX}px ${CY}px` }}>
        <SolidView def={def} yaw={yaw} pitch={pitch} cx={CX} cy={CY} scale={scale} showFaces={show.faces} showEdges={show.edges} showCorners={show.corners} />
      </g>
      {/* Drag surface on top of the shape */}
      <circle cx={CX} cy={CY + 10} r={225} fill="transparent" {...drag} aria-label="Drag to turn the shape" />

      {/* Info card */}
      <g>
        <rect x={706} y={96} width={260} height={262} rx={14} fill={C.ink} opacity={0.1} />
        <rect x={700} y={90} width={260} height={262} rx={14} fill={C.card} stroke={C.ink} strokeWidth={2.5} />
        <rect x={700} y={90} width={260} height={10} rx={5} fill={def.color} />
        <text x={720} y={138} fontSize={32} fill={C.ink} className="caps">{def.name}</text>
        <text x={720} y={168} fontSize={16} fill={C.ink2}>Like {def.like}</text>
        {rows.map(([k, v], i) => (
          <g key={k}>
            <line x1={716} y1={190 + i * 40} x2={944} y2={190 + i * 40} stroke={C.line} strokeWidth={1.5} />
            <text x={720} y={214 + i * 40} fontSize={17} fill={C.muted}>{k}</text>
            <text x={944} y={214 + i * 40} fontSize={19} fontWeight={700} fill={C.ink} textAnchor="end" className="num">
              {v}
            </text>
          </g>
        ))}
      </g>

      {/* Toggles */}
      <SvgButton x={700} y={378} w={124} h={54} fontSize={18} label="Faces" active={show.faces} color={show.faces ? C.yellow : C.card} onClick={() => toggle('faces')} />
      <SvgButton x={836} y={378} w={124} h={54} fontSize={18} label="Edges" active={show.edges} color={show.edges ? C.teal : C.card} textColor={show.edges ? C.white : C.ink} onClick={() => toggle('edges')} disabled={def.edges === 0} />
      <SvgButton x={700} y={446} w={124} h={54} fontSize={18} label="Corners" active={show.corners} color={show.corners ? C.pink : C.card} onClick={() => toggle('corners')} disabled={def.vertices === 0} />
      <SvgButton x={836} y={446} w={124} h={54} fontSize={18} label={spin ? 'Stop' : 'Spin'} active={spin} color={spin ? C.purple : C.card} textColor={spin ? C.white : C.ink} onClick={() => setSpin(!spin)} />
      <SvgButton x={700} y={514} w={124} h={54} fontSize={26} label="↺" title="Turn left (Q)" onClick={() => { setSpin(false); setYaw((y) => y - 0.4); }} />
      <SvgButton x={836} y={514} w={124} h={54} fontSize={26} label="↻" title="Turn right (E)" onClick={() => { setSpin(false); setYaw((y) => y + 0.4); }} />

      <Callout
        at={a.face}
        box={[236, 24]}
        w={240}
        icon={a.faceCurved ? Spline : Square}
        title={a.faceCurved ? 'Curved surface' : 'Flat face'}
        text={a.faceCurved ? 'It bends, so this shape can roll.' : 'A face is a flat side. Count them all!'}
      />
      {a.pointKind === 'corner' && (
        <Callout at={a.point} box={[492, 24]} w={196} icon={CircleDot} title="Corner" text="Where edges meet in a point." />
      )}
      {a.pointKind === 'edge' && (
        <Callout at={a.point} box={[492, 24]} w={196} icon={Box} title="Edge" text="Where two surfaces meet." />
      )}
      {a.pointKind === 'none' && (
        <Callout at={a.point} box={[492, 24]} w={196} icon={CircleDot} title="No edges" text="No corners and no edges at all!" />
      )}
      <Callout at={[CX, CY + 175]} box={[290, 578]} w={330} icon={Hand} title="Turn it around" text="Drag the shape, or press Q and E, to see every side." />
    </SceneSvg>
  );
}

function Thumb() {
  return (
    <svg viewBox="0 0 120 80" aria-hidden>
      <SolidView def={solid('cube')} yaw={0.6} pitch={0.42} cx={38} cy={40} scale={20} strokeWidth={1.6} />
      <SolidView def={solid('cone')} yaw={0.6} pitch={0.3} cx={86} cy={42} scale={22} strokeWidth={1.6} />
    </svg>
  );
}

function nameChoices(answer: SolidDef, pool: SolidDef[], count: number) {
  const others = shuffle(pool.filter((s) => s.id !== answer.id)).slice(0, count - 1);
  return shuffle([answer, ...others]).map((s) => ({ value: s.name }));
}

/** What each solid looks like, for worked answers. */
const LOOKS: Record<SolidId, string> = {
  cube: '6 flat square faces, all the same size',
  cuboid: '6 flat faces, and some are long rectangles',
  sphere: 'a curved surface that is round all over',
  cylinder: '2 flat circles and a curved side',
  cone: '1 flat circle and a curved side up to a point',
  pyramid: 'a square bottom and 4 triangles that meet at a point',
};

/** Worked counts for faces, edges and corners. */
const COUNT_STEPS: Record<string, string[]> = {
  'cube-faces': ['A cube has a top and a bottom: 2 faces.', 'Then front, back, left and right: 4 more.', '2 + 4 = 6 faces.'],
  'cube-edges': ['The top square has 4 edges.', 'The bottom square has 4 edges.', '4 more go up the sides. 4 + 4 + 4 = 12 edges.'],
  'cube-corners': ['The top has 4 corners.', 'The bottom has 4 corners.', '4 + 4 = 8 corners.'],
  'cuboid-faces': ['A cuboid has a top and a bottom: 2 faces.', 'Then front, back, left and right: 4 more.', '2 + 4 = 6 faces.'],
  'pyramid-faces': ['The pyramid sits on 1 square face.', '4 triangle faces lean in to the top.', '1 + 4 = 5 faces.'],
  'pyramid-corners': ['The square bottom has 4 corners.', 'There is 1 more at the very top.', '4 + 1 = 5 corners.'],
  'pyramid-edges': ['The square bottom has 4 edges.', '4 more edges go up to the top point.', '4 + 4 = 8 edges.'],
  'cylinder-flat faces': ['A cylinder has a flat circle on top.', 'And another flat circle on the bottom.', 'So it has 2 flat faces.'],
  'cone-flat faces': ['A cone has a flat circle on the bottom.', 'The rest is curved, up to a point.', 'So it has 1 flat face.'],
  'sphere-corners': ['A sphere is round all over.', 'It has no pointy corners anywhere.', 'So it has 0 corners.'],
};

function makeQuestion(level: number): Question {
  if (level === 0) {
    const pool = SOLIDS.filter((s) => ['cube', 'sphere', 'cylinder', 'cone'].includes(s.id));
    const s = pick(pool);
    return {
      prompt: 'What shape is this?',
      visual: <SolidPicture id={s.id} />,
      choices: nameChoices(s, pool, 3),
      answer: s.name,
      hint: s.curved ? 'Does it have a curved side? Does it have flat circles?' : 'Look at the faces. Are they squares, rectangles or triangles?',
      explain: [`Look closely: it has ${LOOKS[s.id]}.`, `It looks like ${s.like}.`, `It is a ${s.name.toLowerCase()}.`],
    };
  }
  if (level === 1) {
    const kind = pick(['picture', 'roll', 'like']);
    if (kind === 'picture') {
      const s = pick(SOLIDS);
      const others = shuffle(SOLIDS.filter((o) => o.id !== s.id)).slice(0, 2);
      return {
        prompt: `Which one is a ${s.name.toLowerCase()}?`,
        choices: shuffle([s, ...others]).map((o) => ({ value: o.id, name: o.name, label: <SolidPicture id={o.id} /> })),
        answer: s.id,
        hint: `Think of something that is a ${s.name.toLowerCase()} in real life.`,
        explain: [`A ${s.name.toLowerCase()} has ${LOOKS[s.id]}.`, `It looks like ${s.like}.`, `Find the picture of the ${s.name.toLowerCase()}.`],
      };
    }
    if (kind === 'roll') {
      const roller = pick(SOLIDS.filter((s) => s.rolls));
      const stuck = shuffle(SOLIDS.filter((s) => !s.rolls)).slice(0, 2);
      return {
        prompt: 'Which shape can roll?',
        choices: shuffle([roller, ...stuck]).map((s) => ({ value: s.name })),
        answer: roller.name,
        hint: 'Which shape has a curved surface?',
        explain: ['Shapes with only flat faces slide but do not roll.', `A ${roller.name.toLowerCase()} has ${LOOKS[roller.id]}.`, `So the ${roller.name.toLowerCase()} can roll.`],
      };
    }
    const s = pick(SOLIDS);
    return {
      prompt: `Which shape is like ${s.like}?`,
      choices: nameChoices(s, SOLIDS, 3),
      answer: s.name,
      hint: 'Picture the real thing in your head. Is it round? Pointy? Boxy?',
      explain: [`Think of ${s.like}.`, `It has ${LOOKS[s.id]}.`, `That shape is a ${s.name.toLowerCase()}.`],
    };
  }
  const q = pick([
    { s: 'cube', what: 'faces', n: 6 },
    { s: 'cube', what: 'edges', n: 12 },
    { s: 'cube', what: 'corners', n: 8 },
    { s: 'cuboid', what: 'faces', n: 6 },
    { s: 'pyramid', what: 'faces', n: 5 },
    { s: 'pyramid', what: 'corners', n: 5 },
    { s: 'pyramid', what: 'edges', n: 8 },
    { s: 'cylinder', what: 'flat faces', n: 2 },
    { s: 'cone', what: 'flat faces', n: 1 },
    { s: 'sphere', what: 'corners', n: 0 },
  ] as { s: SolidId; what: string; n: number }[]);
  const def = solid(q.s);
  return {
    prompt: `How many ${q.what} does a ${def.name.toLowerCase()} have?`,
    visual: <SolidPicture id={q.s} />,
    choices: numberChoices(q.n, { min: 0, max: 14 }).map((value) => ({ value })),
    answer: String(q.n),
    hint: q.what === 'edges' ? 'Edges are the lines where two faces meet. Count the hidden ones at the back too!' : 'Turn the shape in your head and count the back as well as the front.',
    explain: COUNT_STEPS[`${q.s}-${q.what}`],
  };
}

export const shapes3d: Lesson = {
  id: 'shapes-3d',
  title: '3D Shapes',
  Thumb,
  Scene: ShapesScene,
  sceneHint: 'Drag the shape or press Q / E to turn it',
  learn: {
    heading: 'Solid shapes',
    intro: '3D shapes are solid — you can hold them! They have faces, edges and corners.',
    points: [
      { icon: Square, text: 'A face is a flat side.' },
      { icon: Box, text: 'An edge is where two faces meet.' },
      { icon: CircleDot, text: 'A corner (vertex) is where edges meet in a point.' },
      { icon: Rotate3d, text: 'Turn a shape around to count the hidden sides.' },
    ],
  },
  steps: [
    'Pick up the shape (or spin it on screen).',
    'Count the flat faces. Remember the ones underneath!',
    'Run your finger along the edges and count them.',
    'Touch each pointy corner and count them too.',
  ],
  example: {
    question: 'How many faces does a cube have?',
    visual: <SolidPicture id="cube" />,
    work: ['We can see 3 faces: top, front and side.', 'There are 3 more hiding: bottom, back and the other side.', '3 + 3 = 6.'],
    answer: 'A cube has 6 faces.',
  },
  grownups: [
    'Go on a shape hunt in the kitchen: cans (cylinders), boxes (cuboids), oranges (spheres).',
    'Children often forget hidden faces. Let them hold a real box and put a sticker on each face as they count.',
    'Ask “which shapes can roll, which can stack, which can do both?” — a cylinder can do both!',
    'The words vertex and vertices are worth introducing once “corner” feels comfortable.',
  ],
  makeQuestion,
};

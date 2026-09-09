'use client';

import { useEffect, useRef } from 'react';

export type CoreVariant = 'capture' | 'sync' | 'restore' | 'team';

/**
 * ThreeCore — a living "Continuity Core" visualization.
 *  orbit:   a glowing workspace core with orbiting device nodes; pulses flow
 *           inward (capture), outward (restore), back-and-forth (sync) or
 *           both ways (team) — driven by the hero tabs.
 *  lattice: a 3D data grid where "context packets" drift between nodes,
 *           evoking the infrastructure that carries workspace state.
 * The canvas is drag-rotatable and reacts to the pointer. Lazy-loaded.
 */
export default function ThreeCore({
  variant = 'sync',
  layout = 'orbit',
  interactive = true,
  className = '',
}: {
  variant?: CoreVariant;
  layout?: 'orbit' | 'lattice';
  interactive?: boolean;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const cfgRef = useRef({ variant, layout });

  useEffect(() => {
    cfgRef.current.variant = variant;
  }, [variant]);
  useEffect(() => {
    cfgRef.current.layout = layout;
  }, [layout]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let renderer: any;
    let scene: any;
    let camera: any;
    let rig: any;
    let coreMesh: any;
    let coreWire: any;
    let coreGlow: any;
    let beams: any;
    let lattice: any;
    let raf = 0;
    let disposed = false;
    let cleanupFn: (() => void) | undefined;
    let lastLayout = '';
    let lastVariant = '';

    const palette = () => {
      const cs = getComputedStyle(document.documentElement);
      const hex = (key: string, fallback: string) => {
        const v = cs.getPropertyValue(key).trim();
        if (!v) return fallback;
        const m = v.match(/[\d.a-fA-F]+/g);
        if (v.startsWith('#')) return v;
        if (m && m.length >= 3) {
          const r = Math.round(parseFloat(m[0]!));
          const g = Math.round(parseFloat(m[1]!));
          const b = Math.round(parseFloat(m[2]!));
          return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        }
        return fallback;
      };
      return hex('--os-primary', '#10F4A0');
    };

    try {
      import('three').then((THREE: any) => {
        if (disposed) return;
        const {
          WebGLRenderer, Scene, PerspectiveCamera, Group, IcosahedronGeometry,
          Mesh, MeshBasicMaterial, SphereGeometry, BufferGeometry, BufferAttribute,
          LineSegments, LineBasicMaterial, Points, PointsMaterial, Sprite, SpriteMaterial,
          CanvasTexture, Vector3, AdditiveBlending, Line,
        } = THREE;

        const color = palette();

        const glowTex = (() => {
          const c = document.createElement('canvas');
          c.width = c.height = 128;
          const g = c.getContext('2d')!;
          const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
          grad.addColorStop(0, 'rgba(255,255,255,0.9)');
          grad.addColorStop(0.25, 'rgba(16,244,160,0.45)');
          grad.addColorStop(1, 'rgba(16,244,160,0)');
          g.fillStyle = grad;
          g.fillRect(0, 0, 128, 128);
          return new CanvasTexture(c);
        })();

        scene = new Scene();
        camera = new PerspectiveCamera(55, 1, 0.1, 100);
        camera.position.z = 7.2;

        renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x000000, 0);
        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.inset = '0';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.touchAction = 'pan-y';
        host.appendChild(renderer.domElement);

        rig = new Group();
        scene.add(rig);

        /* ── Core ── */
        coreMesh = new Mesh(
          new IcosahedronGeometry(0.62, 1),
          new MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })
        );
        coreWire = new Mesh(
          new IcosahedronGeometry(0.86, 1),
          new MeshBasicMaterial({ color, transparent: true, opacity: 0.28, wireframe: true })
        );
        coreGlow = new Sprite(new SpriteMaterial({ map: glowTex, color, transparent: true, opacity: 0.5, depthWrite: false, blending: AdditiveBlending }));
        coreGlow.scale.set(4.6, 4.6, 1);
        rig.add(coreMesh);
        rig.add(coreWire);
        rig.add(coreGlow);

        /* ── Devices (nodes) ── */
        const NODE_N = 15;
        const nodeGeo = new SphereGeometry(0.1, 16, 16);
        const nodeMat = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
        const nodes: any[] = [];
        const ringA = { radius: 2.1, tiltSign: 1, y: 0.3, speed: 1.0 };
        const ringB = { radius: 2.95, tiltSign: -1, y: -0.45, speed: 0.72 };
        for (let i = 0; i < NODE_N; i++) {
          const m = new Mesh(nodeGeo, nodeMat.clone());
          const cfg = i % 2 === 0 ? ringA : ringB;
          m.ring = cfg;
          m.ang = (i * 2.4) % (Math.PI * 2);
          m.radius = cfg.radius + (Math.sin(i * 12.9898) * 0.14);
          m.baseScale = 0.9 + (i % 3) * 0.12;
          rig.add(m);
          nodes.push(m);
        }

        /* ── Pulses ── */
        const pulseGeo = new SphereGeometry(0.05, 12, 12);
        const pulseMat = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: AdditiveBlending });
        const pulses: any[] = [];
        for (let i = 0; i < NODE_N + 4; i++) {
          const p = new Mesh(pulseGeo, pulseMat.clone());
          p.userData.t = (i * 0.37) % 1;
          p.userData.spd = 0.08 + (i % 5) * 0.028;
          p.visible = false;
          scene.add(p);
          pulses.push(p);
        }

        /* ── Orbit beams (core → each node) ── */
        {
          const pair: number[] = [];
          for (const n of nodes) pair.push(0, 0, 0, n.position.x, n.position.y, n.position.z);
          const bg = new BufferGeometry();
          bg.setAttribute('position', new BufferAttribute(new Float32Array(pair), 3));
          beams = new LineSegments(bg, new LineBasicMaterial({ color, transparent: true, opacity: 0.28, blending: AdditiveBlending }));
          rig.add(beams);
        }

        /* ── Lattice scene, built on demand ── */
        const buildLattice = () => {
          const pts: number[] = [];
          const seed = 7;
          for (let x = 0; x < 4; x++) {
            for (let y = 0; y < 2; y++) {
              for (let z = 0; z < 4; z++) {
                pts.push(
                  (x - 1.5) * 1.05 + Math.sin(seed * x + y * 2.1) * 0.2,
                  (y - 0.5) * 1.4 + Math.cos(seed * z + y * 1.3) * 0.2,
                  (z - 1.5) * 1.05 + Math.sin(seed * y + x * 1.7) * 0.2
                );
              }
            }
          }
          const geo = new BufferGeometry();
          geo.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3));
          const cloud = new Points(geo, new PointsMaterial({ color, size: 0.09, transparent: true, opacity: 0.7 }));
          rig.add(cloud);

          const count = pts.length / 3;
          const nodePositions: any[] = [];
          for (let i = 0; i < count; i++) nodePositions.push(new Vector3(pts[i * 3]!, pts[i * 3 + 1]!, pts[i * 3 + 2]!));

          const edge: number[] = [];
          for (let i = 0; i < count; i++) {
            for (let j = i + 1; j < count; j++) {
              const dx = (pts[i * 3] ?? 0) - (pts[j * 3] ?? 0);
              const dy = (pts[i * 3 + 1] ?? 0) - (pts[j * 3 + 1] ?? 0);
              const dz = (pts[i * 3 + 2] ?? 0) - (pts[j * 3 + 2] ?? 0);
              const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
              if (d < 1.25 && d > 0.01) {
                edge.push(pts[i * 3]!, pts[i * 3 + 1]!, pts[i * 3 + 2]!, pts[j * 3]!, pts[j * 3 + 1]!, pts[j * 3 + 2]!);
              }
            }
          }
          const edgeGeo = new BufferGeometry();
          edgeGeo.setAttribute('position', new BufferAttribute(new Float32Array(edge), 3));
          const lines = new LineSegments(edgeGeo, new LineBasicMaterial({ color, transparent: true, opacity: 0.22, blending: AdditiveBlending }));
          rig.add(lines);
          return { cloud, lines, nodePositions, geo, edgeGeo };
        };

        const teardownLattice = () => {
          if (!lattice) return;
          rig.remove(lattice.cloud);
          rig.remove(lattice.lines);
          lattice.geo.dispose();
          lattice.cloud.material.dispose();
          lattice.edgeGeo.dispose();
          lattice.lines.material.dispose();
          lattice = null;
        };
        const showOrbit = () => {
          coreMesh.visible = true;
          coreWire.visible = true;
          coreGlow.visible = true;
          beams.visible = true;
          pulses.forEach((p: any) => {
            p.userData.pair = null;
          });
        };
        const showLattice = () => {
          coreMesh.visible = false;
          coreWire.visible = false;
          coreGlow.visible = false;
          beams.visible = false;
          pulses.forEach((p: any) => {
            p.userData.pair = null;
          });
        };

        /* ── Pointer interaction ── */
        const drag = { down: false, px: 0, py: 0, rx: 0, ry: 0, mx: 0.5, my: 0.5 };
        const onDown = (e: PointerEvent) => {
          if (!interactive) return;
          drag.down = true;
          drag.px = e.clientX;
          drag.py = e.clientY;
          renderer.domElement.setPointerCapture?.(e.pointerId);
        };
        const onMove = (e: PointerEvent) => {
          drag.mx = e.clientX;
          drag.my = e.clientY;
          if (!interactive || !drag.down) return;
          drag.ry += (e.clientX - drag.px) * 0.008;
          drag.rx += (e.clientY - drag.py) * 0.008;
          drag.px = e.clientX;
          drag.py = e.clientY;
        };
        const onUp = () => { drag.down = false; };
        renderer.domElement.addEventListener('pointerdown', onDown);
        window.addEventListener('pointermove', onMove, { passive: true });
        window.addEventListener('pointerup', onUp);

        const resize = () => {
          const w = host.clientWidth || window.innerWidth;
          const h = host.clientHeight || window.innerHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };
        resize();

        /* ── Dash config per variant ── */
        const dash = {
          capture: { dir: -1, nm: 1.0, core: 0.9, chord: 0 },
          sync: { dir: 0, nm: 1.35, core: 1.05, chord: 0 },
          restore: { dir: 1, nm: 0.9, core: 1.3, chord: 0 },
          team: { dir: 0.7, nm: 1.6, core: 1.15, chord: 1 },
        } as const;

        let t = 0;
        const from = new Vector3();
        const to = new Vector3();
        const start = new Vector3();
        const end = new Vector3();

        const render = () => {
          if (disposed) return;
          const { variant: v, layout: lay } = cfgRef.current;
          t += 0.005;
          const d = dash[v];

          // Handle layout transitions
          if (lay !== lastLayout) {
            if (lay === 'lattice') { if (!lattice) lattice = buildLattice(); showLattice(); }
            else { teardownLattice(); showOrbit(); }
            lastLayout = lay;
          }
          if (v !== lastVariant) lastVariant = v;

          if (!drag.down) drag.ry += 0.0018;
          drag.rx += (0 - drag.rx) * 0.02;
          rig.rotation.x = drag.rx;

          const px = drag.mx / window.innerWidth - 0.5;
          const py = drag.my / window.innerHeight - 0.5;
          camera.position.x = px * 0.8;
          camera.position.y = -py * 0.5;
          camera.lookAt(0, 0, 0);

          if (lay === 'orbit') {
            rig.rotation.y = drag.ry;
            const pulse = 0.5 + Math.sin(t * 9) * 0.5;
            coreMesh.rotation.y += 0.006;
            coreWire.rotation.y -= 0.01;
            coreWire.rotation.x += 0.004;
            coreMesh.scale.setScalar(d.core + pulse * 0.12);
            coreWire.scale.setScalar(1 + pulse * 0.12);
            coreGlow.material.opacity = 0.4 + pulse * 0.25;

            for (const n of nodes) {
              const ang = (n.ang + t * d.nm * n.ring.speed * 2.2) % (Math.PI * 2);
              n.position.x = Math.cos(ang) * n.radius;
              n.position.z = Math.sin(ang) * n.radius;
              n.position.y = n.ring.y + Math.cos(ang * 1.7 + n.ring.tiltSign) * 0.3;
              n.scale.setScalar(n.baseScale + Math.sin(t * 3 + n.radius * 3) * 0.35);
            }

            for (let i = 0; i < pulses.length; i++) {
              const p = pulses[i];
              const node = nodes[i % nodes.length];
              let dir: number;
              if (d.dir === 0) dir = Math.sin(t * 1.4 + i) > 0 ? 1 : -1;
              else dir = d.dir;

              if (d.chord === 1 && i % 2 === 1) {
                // team: pulse hops toward a node on the other ring
                from.copy(node.position);
                to.copy(nodes[(i + 7) % nodes.length].position);
                dir = 1;
              } else {
                from.copy(node.position);
                to.set(0, 0, 0);
              }
              p.userData.t += p.userData.spd * dir * d.nm * 2.2;
              let k = p.userData.t % 2;
              if (k < 0) k += 2;
              const prog = k <= 1 ? k : 2 - k;
              p.position.copy(from).lerp(to, prog);
              p.visible = true;
              p.material.opacity = 0.25 + Math.sin(prog * Math.PI) * 0.75;
              p.scale.setScalar(0.1 + Math.sin(prog * Math.PI) * 0.22);
            }
          } else if (lay === 'lattice') {
            rig.rotation.y = drag.ry * 1.35;
            rig.rotation.x = drag.rx * 1.1;
            const lp = lattice.nodePositions;
            for (let i = 0; i < pulses.length; i++) {
              const p = pulses[i];
              if (!p.userData.pair) {
                const a = Math.floor(Math.random() * lp.length);
                let b = Math.floor(Math.random() * lp.length);
                if (b === a) b = (b + 1) % lp.length;
                p.userData.pair = [a, b];
                p.userData.t2 = 0;
              }
              p.userData.t2 += p.userData.spd * d.nm * 2.6;
              if (p.userData.t2 > 1.2) { p.userData.pair = null; continue; }
              start.copy(lp[p.userData.pair[0]]);
              end.copy(lp[p.userData.pair[1]]);
              p.position.copy(start).lerp(end, Math.min(p.userData.t2, 1));
              p.visible = true;
              p.scale.setScalar(0.14);
              p.material.opacity = Math.min(0.9, p.userData.t2 * 2);
            }
          }

          renderer.render(scene, camera);
          raf = requestAnimationFrame(render);
        };

        const onVis = () => {
          if (document.hidden) cancelAnimationFrame(raf);
          else if (!reduced && !disposed) raf = requestAnimationFrame(render);
        };
        document.addEventListener('visibilitychange', onVis);

        if (reduced) {
          renderer.render(scene, camera);
        } else {
          render();
        }

        const ro = new ResizeObserver(resize);
        ro.observe(host);

        const disposables = [nodeGeo, nodeMat, pulseGeo, pulseMat,
          coreMesh.geometry, coreMesh.material, coreWire.geometry, coreWire.material,
          coreGlow.material.map, coreGlow.material,
          beams.geometry, beams.material];

        cleanupFn = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          renderer.domElement.removeEventListener('pointerdown', onDown);
          document.removeEventListener('visibilitychange', onVis);
          ro.disconnect();
          cancelAnimationFrame(raf);
          for (const o of disposables) o?.dispose?.();
          teardownLattice();
          renderer.dispose();
          if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
        };
      });
    } catch {
      /* WebGL unavailable — render nothing */
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanupFn?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} aria-hidden className={`absolute inset-0 ${className}`} />;
}
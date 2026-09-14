'use client';

import { useEffect, useRef } from 'react';

/**
 * ThreeNet — an ambient 3D "context constellation".
 * A drifting cloud of nodes connected by proximity links, nodding toward the
 * pointer. Mirrors Continua's story: context carried between machines.
 * Lazy-loaded (dynamic import, ssr:false) so the main bundle stays lean.
 */
export default function ThreeNet() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const coarse =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(pointer: coarse)').matches;

    let renderer: any;
    let scene: any;
    let camera: any;
    let points: any;
    let linePts: any;
    let lineGeo: any;
    let lineMat: any;
    let line: any;
    let raf = 0;
    let disposed = false;
    let cleanup: (() => void) | undefined;

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
      return {
        a: hex('--os-primary', '#10F4A0'),
        b: hex('--os-primary-container', '#0BC68A'),
      };
    };

    try {
      import('three').then((THREE) => {
        if (disposed) return;
        const { WebGLRenderer, Scene, PerspectiveCamera, Points, BufferGeometry, Float32BufferAttribute, PointsMaterial, LineSegments, LineBasicMaterial, Vector3 } = THREE as any;

        const { a, b } = palette();
        const isDark = document.documentElement.classList.contains('dark');

        scene = new Scene();
        camera = new PerspectiveCamera(60, 1, 0.1, 100);
        camera.position.z = 11;

        renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x000000, 0);
        host.appendChild(renderer.domElement);
        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.inset = '0';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';

        const pointCount = coarse ? 320 : window.innerWidth < 768 ? 480 : 950;
        const positions = new Float32Array(pointCount * 3);
        const base = new Float32Array(pointCount * 3);
        const rnd = new Float32Array(pointCount);

        for (let i = 0; i < pointCount; i++) {
          const x = (Math.random() - 0.5) * 24;
          const y = (Math.random() - 0.5) * 13;
          const z = (Math.random() - 0.5) * 12;
          positions[i * 3] = base[i * 3] = x;
          positions[i * 3 + 1] = base[i * 3 + 1] = y;
          positions[i * 3 + 2] = base[i * 3 + 2] = z;
          rnd[i] = Math.random() * Math.PI * 2;
        }

        const geo = new BufferGeometry();
        geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
        const mat = new PointsMaterial({
          color: a,
          size: 0.07,
          transparent: true,
          opacity: isDark ? 0.55 : 0.45,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          sizeAttenuation: true,
        });
        points = new Points(geo, mat);
        scene.add(points);

        const lineCount = pointCount * 4;
        const lpos = new Float32Array(lineCount * 6);
        lineGeo = new BufferGeometry();
        lineGeo.setAttribute('position', new Float32BufferAttribute(lpos, 3));
        lineMat = new LineBasicMaterial({
          color: b,
          transparent: true,
          opacity: isDark ? 0.14 : 0.16,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        line = new LineSegments(lineGeo, lineMat);
        scene.add(line);
        linePts = new Vector3();

        const v1 = new Vector3();
        const v2 = new Vector3();

        const pointer = { x: 0, y: 0 };
        const onPointer = (e: PointerEvent) => {
          pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
          pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
        };
        window.addEventListener('pointermove', onPointer, { passive: true });

        const clock = { t: Math.random() * 1000 };

        const updateLines = () => {
          let li = 0;
          const posArr = (geo.attributes.position as any).array as Float32Array;
          const thr = 1.7; // link distance
          for (let i = 0; i < pointCount && li < lineCount; i++) {
            v1.fromArray(posArr, i * 3);
            for (let j = i + 1; j < pointCount && li < lineCount; j++) {
              v2.fromArray(posArr, j * 3);
              if (v1.distanceToSquared(v2) < thr * thr) {
                v1.toArray(lpos, li * 6);
                v2.toArray(lpos, li * 6 + 3);
                li++;
              }
            }
          }
          lineGeo.attributes.position.needsUpdate = true;
          lineGeo.setDrawRange(0, li);
        };

        const render = () => {
          if (disposed) return;
          clock.t += 0.004;
          const arr = (geo.attributes.position as any).array as Float32Array;
          const t = clock.t;
          for (let i = 0; i < pointCount; i++) {
            const i3 = i * 3;
            const ph = rnd[i]!;
            arr[i3] = (base[i3] ?? 0) + Math.sin(t * 0.4 + ph) * 0.25 + Math.cos(t * 0.22 + ph * 1.7) * 0.18;
            arr[i3 + 1] = (base[i3 + 1] ?? 0) + Math.cos(t * 0.33 + ph * 2.1) * 0.22;
            arr[i3 + 2] = (base[i3 + 2] ?? 0) + Math.sin(t * 0.28 + ph * 1.3) * 0.2;
          }
          geo.attributes.position.needsUpdate = true;

          camera.position.x += (pointer.x * 1.15 - camera.position.x) * 0.04;
          camera.position.y += (pointer.y * 0.8 - camera.position.y) * 0.04;
          camera.lookAt(0, 0, 0);

          updateLines();
          renderer.render(scene, camera);
          raf = requestAnimationFrame(render);
        };

        const resize = () => {
          const w = host.clientWidth || window.innerWidth;
          const h = host.clientHeight || window.innerHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };
        resize();
        updateLines();

        if (reduced) {
          renderer.render(scene, camera);
        } else {
          render();
        }

        const ro = new ResizeObserver(resize);
        ro.observe(host);
        const onVis = () => {
          if (document.hidden) cancelAnimationFrame(raf);
          else if (!reduced && !disposed) raf = requestAnimationFrame(render);
        };
        document.addEventListener('visibilitychange', onVis);

        const cleanupThree = () => {
          window.removeEventListener('pointermove', onPointer);
          document.removeEventListener('visibilitychange', onVis);
          ro.disconnect();
          cancelAnimationFrame(raf);
          geo.dispose();
          mat.dispose();
          lineGeo.dispose();
          lineMat.dispose();
          renderer.dispose();
          host.removeChild(renderer.domElement);
        };
        cleanup = cleanupThree;
      });
    } catch {
      /* WebGL unavailable — render nothing, landing still works */
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, []);

  return <div ref={hostRef} aria-hidden className="absolute inset-0 pointer-events-none" />;
}
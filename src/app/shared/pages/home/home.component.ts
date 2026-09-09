import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SITE } from '../../../data/site.data';
import { MEMBERSHIP_PLANS } from '../../../core/models/membership.model';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

export interface GymService {
  icon: 'dumbbell' | 'users' | 'flame' | 'leaf';
  title: string;
  description: string;
}

export interface StatItem {
  value: string;
  label: string;
}

export interface HexVertex {
  x: number;
  y: number;
  key: string;
}

export interface HexNode {
  points: string;
  perimeter: number;
  vertices: HexVertex[];
  buildDelay: string;
  buildDuration: string;
  // Referencia directa (no por key) a los 6 registros compartidos de sus
  // vértices — evita un Map.get() por vértice en cada fotograma del loop.
  sharedRefs: SharedVertexWobble[];
}

// Estado interno (no ligado a la plantilla) para la deformación cíclica tras
// construirse. CLAVE: un vértice compartido por dos hexágonos vecinos es
// UN SOLO registro aquí — ambos hexágonos leen la misma posición en vivo,
// así nunca se abre una brecha entre ellos. Cada vértice único tiene su
// propio "sobre" de ida y vuelta (0 → deformado → 0, vuelve a su forma
// regular entre ciclos) y su propia dirección fija — arrítmico respecto a
// los demás vértices, pero la malla completa se deforma como un solo tejido.
interface SharedVertexWobble {
  baseX: number;
  baseY: number;
  dirX: number;
  dirY: number;
  maxAmp: number;
  freq: number;
  // No empieza a deformarse antes de este instante (segundos) — el mayor
  // "termina de trazarse" entre TODOS los hexágonos que comparten este
  // vértice, así cada uno se dibuja siempre con su forma recta normal.
  readyAt: number;
  // Posición en vivo, mutada en el propio objeto en vez de crear uno nuevo
  // cada fotograma (menos basura para el recolector). `resting` evita
  // recalcular/reescribir cuando el vértice lleva un rato quieto en 0.
  liveX: number;
  liveY: number;
  liveStr: string;
  resting: boolean;
}

const SERVICES: GymService[] = [
  { icon: 'dumbbell', title: 'Entrenamiento personalizado', description: 'Rutinas diseñadas por instructores certificados según tu objetivo y nivel.' },
  { icon: 'users',     title: 'Clases grupales',            description: 'Sesiones de alta energía: funcional, spinning, yoga y más, todos los días.' },
  { icon: 'flame',     title: 'Musculación',                description: 'Zona de pesas y máquinas de última generación, siempre disponible.' },
  { icon: 'leaf',      title: 'Nutrición y bienestar',       description: 'Acompañamiento nutricional para que tus resultados se sostengan.' },
];

const STATS: StatItem[] = [
  { value: '10+',  label: 'Años de experiencia' },
  { value: '500+', label: 'Miembros activos' },
  { value: '15',   label: 'Instructores certificados' },
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, ScrollRevealDirective],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly ngZone = inject(NgZone);

  readonly site = SITE;
  readonly plans = MEMBERSHIP_PLANS;
  readonly services = SERVICES;
  readonly stats = STATS;

  // ── Red de hexágonos nodales del hero — enjambre orgánico: cada hexágono
  // nuevo nace de un vértice del hexágono inmediatamente anterior (misma
  // matemática de panal, cero traslapes garantizados), cubriendo todo el
  // ancho. Se dibujan uno a la vez, estrictamente en fila, y el trazo queda
  // permanente. Una vez construido, cada vértice bambolea por su cuenta —
  // así los ángulos del hexágono quedan irregulares, vivos.
  // Se calcula UNA vez y los 3 campos se llenan desde ese mismo resultado
  // — si cada uno tuviera su propio inicializador con valor por defecto,
  // el orden de declaración de la clase pisaría lo que buildHexSwarm ya
  // había calculado (así se rompió el bamboleo la primera vez).
  private readonly swarm = this.buildHexSwarm();
  readonly hexGrid: HexNode[] = this.swarm.hexes;
  // Un registro por vértice ÚNICO (no por hexágono) — los hexágonos vecinos
  // que comparten un vértice apuntan al MISMO registro, así se mueven como
  // un solo punto y la malla nunca se abre en las costuras.
  private readonly vertexRegistry: Map<string, SharedVertexWobble> = this.swarm.registry;
  private rafId = 0;

  private buildHexSwarm(): { hexes: HexNode[]; registry: Map<string, SharedVertexWobble> } {
    const size = 72 * 1.3; // +80% sobre el original (40), y +30% más sobre eso
    // 6 direcciones axiales para hexágono flat-top — vecino comparte arista
    const dirs: [number, number][] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
    // Por cada dirección, qué par de vértices (índice de ángulo 0-5, en pasos
    // de 60°) forma la arista que se cruza al moverse en esa dirección —
    // usado para que cada hexágono nuevo empiece a TRAZARSE justo por el
    // lado que lo une con su padre, en vez de siempre por el mismo vértice
    // fijo (eso era lo que causaba el "brinco" extraño al conectar).
    const edgeVertexPairs: [number, number][] = [[0, 1], [5, 0], [4, 5], [3, 4], [2, 3], [1, 2]];
    const axialToPixel = (q: number, r: number) => ({
      x: size * 1.5 * q,
      y: size * Math.sqrt(3) * (r + q / 2),
    });

    const occupied = new Map<string, { q: number; r: number }>();
    const key = (q: number, r: number) => `${q},${r}`;

    type Cell = { q: number; r: number; startVertexIndex: number };

    const growCluster = (startQ: number, startR: number, count: number): Cell[] => {
      const clusterOrder: Cell[] = [];
      const start: Cell = { q: startQ, r: startR, startVertexIndex: 0 };
      if (occupied.has(key(start.q, start.r))) return clusterOrder;
      occupied.set(key(start.q, start.r), start);
      clusterOrder.push(start);

      let anchorIdx = 0;
      while (clusterOrder.length < count) {
        let anchor = clusterOrder[anchorIdx];
        let free = dirs
          .map(([dq, dr], dirIdx) => ({ dirIdx, q: anchor.q + dq, r: anchor.r + dr }))
          .filter(p => !occupied.has(key(p.q, p.r)));

        // Si el hexágono inmediatamente anterior ya no tiene espacio libre,
        // se busca el candidato más reciente (de ESTE enjambre) que sí
        // tenga — sigue creciendo cerca de lo último construido.
        let tries = 0;
        while (!free.length && tries < clusterOrder.length) {
          anchorIdx = (anchorIdx + 1) % clusterOrder.length;
          anchor = clusterOrder[anchorIdx];
          free = dirs
            .map(([dq, dr], dirIdx) => ({ dirIdx, q: anchor.q + dq, r: anchor.r + dr }))
            .filter(p => !occupied.has(key(p.q, p.r)));
          tries++;
        }
        if (!free.length) break; // este enjambre quedó saturado, se corta ahí

        const pick = free[Math.floor(Math.random() * free.length)];
        // Vista desde el hijo, la arista compartida queda en la dirección
        // opuesta a la usada para llegar a él.
        const childDirIdx = (pick.dirIdx + 3) % 6;
        const cell: Cell = { q: pick.q, r: pick.r, startVertexIndex: edgeVertexPairs[childDirIdx][0] };
        occupied.set(key(cell.q, cell.r), cell);
        clusterOrder.push(cell);
        anchorIdx = clusterOrder.length - 1;
      }
      return clusterOrder;
    };

    const targetCount = 60;
    // La FORMA del enjambre se genera libre (rama orgánica, sin restringir
    // dirección) desde el centro para buena cobertura.
    const shape = growCluster(0, 0, targetCount);
    const shapeKey = (q: number, r: number) => `${q},${r}`;
    const shapeIndexByKey = new Map(shape.map((c, i) => [shapeKey(c.q, c.r), i]));

    // Posición FINAL en pantalla de cada celda — hay que calcularla ANTES
    // de elegir la esquina de arranque. La vez anterior el error fue medir
    // la esquina sobre coordenadas crudas (antes de escalar y centrar), así
    // que la celda "más a la esquina" terminaba fuera del lienzo visible
    // (ej. en x=1351, cuando el viewBox solo llega a 1200) y no se veía.
    const rawPixels = shape.map(c => axialToPixel(c.q, c.r));
    const minXr = Math.min(...rawPixels.map(p => p.x));
    const maxXr = Math.max(...rawPixels.map(p => p.x));
    const spreadX = Math.max(maxXr - minXr, 1);
    // Sin auto-ajuste de escala: `size` (arriba) define el tamaño real de
    // cada hexágono de forma directa y predecible. Antes se reescalaba todo
    // para forzar que el conjunto cubriera 1450px de ancho — pero como el
    // spread crece proporcional al mismo `size`, ese ajuste CANCELABA
    // cualquier cambio de tamaño. Solo se reduce en el caso extremo de que
    // el paseo se disperse demasiado.
    const scale = spreadX > 2600 ? 2600 / spreadX : 1;
    const scaledSize = size * scale;

    const scaledPixels = rawPixels.map(p => ({ x: p.x * scale, y: p.y * scale }));
    const minX = Math.min(...scaledPixels.map(p => p.x));
    const maxX = Math.max(...scaledPixels.map(p => p.x));
    const minY = Math.min(...scaledPixels.map(p => p.y));
    const maxY = Math.max(...scaledPixels.map(p => p.y));
    const offsetX = 600 - (minX + maxX) / 2;
    const offsetY = 350 - (minY + maxY) / 2;
    // Posición final real de cada celda de `shape`, en el mismo orden.
    const shapeFinalPixels = scaledPixels.map(p => ({ x: p.x + offsetX, y: p.y + offsetY }));

    // El ORDEN DE DIBUJADO se recalcula aparte: se busca la celda cuya
    // posición FINAL quede más cerca de la esquina superior derecha visible
    // (viewBox 1200×700) y se recorre el resto por adyacencia real (BFS)
    // desde ahí — así la figura arranca donde realmente se ve, y cada
    // pieza sigue naciendo de una vecina ya dibujada.
    //
    // OJO: el enjambre completo suele ser más grande que el viewBox (para
    // que la malla se sienta "sin límites"), así que buscar la celda más
    // cercana a (1200,0) entre TODAS podía devolver una que sigue cayendo
    // fuera del área visible si esa zona del enjambre está dispersa (rama
    // orgánica, no rectángulo relleno). Por eso primero se filtra a las
    // celdas que SÍ caen dentro (o casi) del viewBox, y solo se busca la
    // más cercana a la esquina DENTRO de ese subconjunto.
    const VISIBLE_MARGIN = 40;
    const candidateIdxs = shapeFinalPixels
      .map((p, i) => i)
      .filter(i => {
        const p = shapeFinalPixels[i];
        return p.x >= -VISIBLE_MARGIN && p.x <= 1200 + VISIBLE_MARGIN
          && p.y >= -VISIBLE_MARGIN && p.y <= 700 + VISIBLE_MARGIN;
      });
    const searchPool = candidateIdxs.length ? candidateIdxs : shapeFinalPixels.map((_, i) => i);

    let startIdx = searchPool[0];
    let bestDist = Infinity;
    for (const i of searchPool) {
      const p = shapeFinalPixels[i];
      const dx = p.x - 1200;
      const dy = p.y - 0;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) { bestDist = dist; startIdx = i; }
    }

    // El recorrido NO es un BFS plano (FIFO): eso descubre vecinos en el
    // orden en que aparecen en `dirs`, así que ramas que se van fuera del
    // viewBox (hacia arriba/afuera) se dibujaban intercaladas con las que sí
    // se ven, dejando huecos visibles largos entre hexágonos "visibles".
    // En vez de eso, el frente de espera se recorre dando SIEMPRE prioridad
    // a cualquier celda pendiente que caiga dentro del área visible; solo se
    // recurre a una fuera de cuadro cuando ya no queda ninguna visible en el
    // frente — así la malla llena primero la pantalla antes de crecer hacia
    // zonas que el usuario no ve.
    const isVisibleIdx = (i: number) => {
      const p = shapeFinalPixels[i];
      return p.x >= -VISIBLE_MARGIN && p.x <= 1200 + VISIBLE_MARGIN
        && p.y >= -VISIBLE_MARGIN && p.y <= 700 + VISIBLE_MARGIN;
    };

    const visited = new Set<number>([startIdx]);
    const order: Cell[] = [{ ...shape[startIdx], startVertexIndex: 0 }];
    const orderShapeIdx: number[] = [startIdx];
    const frontier: { idx: number; childDirIdx: number }[] = [];
    const enqueueNeighbors = (curIdx: number) => {
      const cur = shape[curIdx];
      for (let dirIdx = 0; dirIdx < dirs.length; dirIdx++) {
        const [dq, dr] = dirs[dirIdx];
        const nIdx = shapeIndexByKey.get(shapeKey(cur.q + dq, cur.r + dr));
        if (nIdx === undefined || visited.has(nIdx)) continue;
        visited.add(nIdx);
        // Vista desde el vecino nuevo, la arista compartida queda en la
        // dirección opuesta a la usada para llegar a él.
        frontier.push({ idx: nIdx, childDirIdx: (dirIdx + 3) % 6 });
      }
    };
    enqueueNeighbors(startIdx);
    while (frontier.length) {
      // Se recorre el frente DESDE EL FINAL: ahí quedan los vecinos del
      // hexágono que se acaba de dibujar. Si alguno es visible, el trazo
      // sigue por ESE lado (lo que pediste: continuar por los lados que
      // quedan visibles), en vez de saltar a una rama vieja y dejar este
      // hexágono varado a medio aparecer (huérfano, como atascado/bug).
      // Solo si NINGÚN vecino reciente ni pendiente es visible, se sigue en
      // profundidad (última celda agregada) para no perder la conexión.
      let pick = -1;
      for (let k = frontier.length - 1; k >= 0; k--) {
        if (isVisibleIdx(frontier[k].idx)) { pick = k; break; }
      }
      if (pick === -1) pick = frontier.length - 1;
      const { idx: nIdx, childDirIdx } = frontier.splice(pick, 1)[0];
      order.push({ ...shape[nIdx], startVertexIndex: edgeVertexPairs[childDirIdx][0] });
      orderShapeIdx.push(nIdx);
      enqueueNeighbors(nIdx);
    }
    // Por seguridad, si algo quedara sin visitar (no debería pasar en un
    // enjambre conectado), se agrega al final sin romper el resto.
    shape.forEach((c, i) => {
      if (!visited.has(i)) { order.push({ ...c, startVertexIndex: 0 }); orderShapeIdx.push(i); }
    });

    // Reutiliza las posiciones finales ya calculadas, reordenadas igual que
    // `order` — nada de recalcular escala/centrado por segunda vez.
    const pixels = orderShapeIdx.map(i => shapeFinalPixels[i]);

    const hexes: HexNode[] = [];
    const registry = new Map<string, SharedVertexWobble>();
    let cumulativeDelay = 0;

    pixels.forEach((p, i) => {
      // `pixels[i]` ya es la posición FINAL (escalada y centrada) — sumar
      // offsetX/offsetY otra vez aquí desplazaba todo el enjambre de su
      // lugar correcto.
      const cx = p.x;
      const cy = p.y;
      // Rotado para que el primer punto de la lista (por donde arranca el
      // trazo) sea el vértice compartido con el hexágono padre — así el
      // dibujo nace visualmente DESDE la conexión, sin brincos.
      const baseVertices = this.hexVertices(cx, cy, scaledSize);
      const rot = order[i].startVertexIndex;
      const vertices = rot ? [...baseVertices.slice(rot), ...baseVertices.slice(0, rot)] : baseVertices;
      const duration = (1.7 + Math.random() * 0.9) * 3; // 3× más lento

      hexes.push({
        points: vertices.map(v => `${v.x},${v.y}`).join(' '),
        vertices,
        perimeter: Math.round(scaledSize * 6),
        buildDelay: `${cumulativeDelay.toFixed(2)}s`,
        buildDuration: `${duration.toFixed(2)}s`,
        sharedRefs: [], // se llena más abajo, una vez el registro está completo
      });

      // Cada vértice ÚNICO se registra una sola vez (la primera vez que
      // aparece). Si un hexágono vecino comparte esa misma coordenada, no
      // crea un registro nuevo — reutiliza el existente, así ambos leen
      // siempre la misma posición en vivo y el vértice compartido nunca
      // se separa en dos. `readyAt` se actualiza al máximo entre todos los
      // hexágonos que comparten ese vértice, para que ninguno se dibuje
      // ya deformado — primero termina de trazarse recto, y solo cuando
      // el ÚLTIMO vecino que lo toca también termina, empieza a bambolear.
      const finishTime = cumulativeDelay + duration;
      for (const v of vertices) {
        const existing = registry.get(v.key);
        if (existing) {
          existing.readyAt = Math.max(existing.readyAt, finishTime);
          continue;
        }
        const angle = Math.random() * Math.PI * 2;
        // -90%, luego -50%, luego -50%, luego otro -50% de velocidad: período × 10 × 2 × 2 × 2
        const period = (3 + Math.random() * 4) * 80;
        registry.set(v.key, {
          baseX: v.x,
          baseY: v.y,
          dirX: Math.cos(angle),
          dirY: Math.sin(angle),
          maxAmp: scaledSize * (0.03 + Math.random() * 0.03), // margen de deformación -50% -50%
          freq: (2 * Math.PI) / period,
          readyAt: finishTime,
          liveX: v.x,
          liveY: v.y,
          liveStr: `${v.x},${v.y}`,
          resting: true,
        });
      }

      cumulativeDelay += duration * 0.92; // ligero solape para que no se sienta lento entre piezas
    });

    // Ahora que el registro está completo, cada hexágono guarda una
    // referencia DIRECTA a sus 6 vértices compartidos (en vez de buscar
    // por key en el Map en cada fotograma del loop de animación).
    for (const hex of hexes) {
      hex.sharedRefs = hex.vertices.map(v => registry.get(v.key)!);
    }

    return { hexes, registry };
  }

  private hexVertices(cx: number, cy: number, size: number): HexVertex[] {
    const pts: HexVertex[] = [];
    for (let a = 0; a < 6; a++) {
      const angle = (Math.PI / 180) * (60 * a);
      const x = Number((cx + size * Math.cos(angle)).toFixed(1));
      const y = Number((cy + size * Math.sin(angle)).toFixed(1));
      pts.push({ x, y, key: `${x}-${y}` });
    }
    return pts;
  }

  ngAfterViewInit(): void {
    // La red de hexágonos está oculta en móvil (mismo corte que $bp-sm) —
    // no tiene sentido correr el loop de animación para algo que no se ve.
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const polys = this.el.nativeElement.querySelectorAll('.hex-network__hex') as NodeListOf<SVGPolygonElement>;
    const nodeGroups = this.el.nativeElement.querySelectorAll('.hex-network__node-group') as NodeListOf<SVGGElement>;

    // Fuera de la zona de Angular: si no, zone.js dispara detección de
    // cambios en cada requestAnimationFrame y Angular vuelve a aplicar el
    // binding estático [attr.points], revirtiendo esta escritura directa
    // antes de que se llegue a pintar.
    const hexGrid = this.hexGrid;
    const allVertices = [...this.vertexRegistry.values()];
    const lastHexStr: (string | null)[] = new Array(hexGrid.length).fill(null);

    // Rendimiento: un bamboleo con ciclos de 30-70s no necesita recalcularse
    // a 60fps — a ~24fps la diferencia es imperceptible y el trabajo por
    // fotograma baja más de la mitad.
    const FRAME_INTERVAL = 1000 / 24;
    let lastFrameTime = 0;

    this.ngZone.runOutsideAngular(() => {
      const loop = (t: number) => {
        this.rafId = requestAnimationFrame(loop);
        if (t - lastFrameTime < FRAME_INTERVAL) return;
        lastFrameTime = t;
        const time = t / 1000;

        // 1) Recalcular SOLO los vértices que ya empezaron a bambolear —
        // uno que aún no llega a `readyAt` se queda quieto en su posición
        // base y no cuesta nada por fotograma (ni Math, ni String).
        for (const v of allVertices) {
          if (time < v.readyAt) continue;
          // OJO: nada de sumar una fase aleatoria aquí. En el instante exacto
          // en que `time === readyAt` esto debe dar env=0 (reposo) SIEMPRE,
          // igual que el valor con el que estaba "congelado" un instante
          // antes — si se sumara una fase, en ese instante `x` arrancaría en
          // un punto cualquiera del ciclo y el vértice saltaría de golpe a
          // una posición ya deformada (el "brinco" al terminar de dibujarse).
          // El desfase entre vértices ya lo da que cada uno tiene su propio
          // `readyAt` y su propio período — no hace falta una fase extra.
          const x = (time - v.readyAt) * v.freq;
          // Coseno elevado (no seno recortado): la velocidad de deformación
          // es CERO justo en el punto de reposo, así el regreso a la forma
          // regular es progresivo, sin frenazo abrupto.
          const env = (1 - Math.cos(x)) / 2;
          v.liveX = v.baseX + v.dirX * v.maxAmp * env;
          v.liveY = v.baseY + v.dirY * v.maxAmp * env;
          v.liveStr = `${v.liveX.toFixed(1)},${v.liveY.toFixed(1)}`;
        }

        // 2) Cada hexágono arma su contorno leyendo la posición ya
        // calculada de sus vértices (referencia directa, sin buscar en un
        // Map) — si el resultado es igual al del fotograma anterior (ej.
        // todos sus vértices siguen en reposo), no se toca el DOM.
        hexGrid.forEach((hex, i) => {
          const refs = hex.sharedRefs;
          let str = refs[0].liveStr;
          for (let vi = 1; vi < refs.length; vi++) str += ' ' + refs[vi].liveStr;

          if (str === lastHexStr[i]) return;
          lastHexStr[i] = str;
          polys[i]?.setAttribute('points', str);

          const circles = nodeGroups[i]?.children;
          if (circles) {
            for (let c = 0; c < circles.length; c++) {
              circles[c].setAttribute('cx', refs[c].liveX.toFixed(1));
              circles[c].setAttribute('cy', refs[c].liveY.toFixed(1));
            }
          }
        });
      };
      this.rafId = requestAnimationFrame(loop);
    });
  }

  ngOnDestroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  private hexPoints(cx: number, cy: number, size: number): string {
    return this.hexVertices(cx, cy, size).map(v => `${v.x},${v.y}`).join(' ');
  }

  // ── Franja de carga del hero — carga 0→100% al entrar/recargar la página ────
  private readonly gaugeRaw = signal(0);
  readonly gaugePercent = computed(() => Math.round(this.gaugeRaw()));
  readonly gaugeCharging = signal(false);
  readonly gaugeCharged = signal(false);

  formatPrice(value: number): string {
    return value.toLocaleString('es-CO');
  }

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  ngOnInit(): void {
    this.runLoadStrip();
  }

  // Curva "surge": arranque brusco, tiembla al acercarse al tope y luego
  // consolida — imita la carga de poder/estamina de un HUD de videojuego.
  private runLoadStrip(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.gaugeRaw.set(100);
      this.gaugeCharged.set(true);
      return;
    }

    const duration = 5700; // 3× — carga lenta y deliberada, tipo barra de poder
    const start = performance.now();
    this.gaugeCharging.set(true);

    // Igual que el loop del enjambre de hexágonos: un rAF corriendo DENTRO
    // de la zona de Angular dispara detección de cambios en cada frame, y
    // esa detección reaplica bindings estáticos como [attr.points]="hex.points"
    // en los hexágonos ya deformados — devolviéndolos de golpe a su forma
    // regular ("brinco") hasta que el loop del wobble los corrige de nuevo.
    // Se saca este loop de la zona para que no dispare CD 60 veces/seg.
    this.ngZone.runOutsideAngular(() => {
      const tick = (now: number) => {
        const elapsed = now - start;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        this.gaugeRaw.set(eased * 100);

        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          this.gaugeRaw.set(100);
          this.gaugeCharging.set(false);
          this.gaugeCharged.set(true);
        }
      };

      requestAnimationFrame(tick);
    });
  }
}

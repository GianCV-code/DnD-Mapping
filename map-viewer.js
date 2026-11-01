// Visor de mapa con Pan & Zoom optimizado para ratón y gestos táctiles (Pinch-to-zoom)
import { getMarkerType, PARTY_TOKEN_DATA } from "./icons.js";

export class MapViewer {
  constructor({
    viewportEl,
    mapContainerEl,
    mapImageEl,
    markersLayerEl,
    partyLayerEl,
    routeSvgEl,
    measureSvgEl,
    routeBadgeEl,
    measureBadgeEl,
    onMarkerClick,
    onMarkerMove,
    onMapClick,
    onPartyClick,
    onMovePartyClick,
    onMoveMarkerClick,
    onRouteUpdate,
    onRouteFinish,
    onRouteDelete,
    onRouteBadgeClick
  }) {
    this.viewportEl = viewportEl;
    this.mapContainerEl = mapContainerEl;
    this.mapImageEl = mapImageEl;
    this.markersLayerEl = markersLayerEl;
    this.partyLayerEl = partyLayerEl;
    this.routeSvgEl = routeSvgEl;
    this.measureSvgEl = measureSvgEl;
    this.routeBadgeEl = routeBadgeEl;
    this.measureBadgeEl = measureBadgeEl;
    this.onMarkerClick = onMarkerClick;
    this.onMarkerMove = onMarkerMove;
    this.onMapClick = onMapClick;
    this.onPartyClick = onPartyClick;
    this.onMovePartyClick = onMovePartyClick;
    this.onMoveMarkerClick = onMoveMarkerClick;
    this.onRouteUpdate = onRouteUpdate;
    this.onRouteFinish = onRouteFinish;
    this.onRouteDelete = onRouteDelete;
    this.onRouteBadgeClick = onRouteBadgeClick;

    // Estado de transformación
    this.scale = 0.5;
    this.minScale = 0.2;
    this.maxScale = 4.0;
    this.translateX = 0;
    this.translateY = 0;

    // Arrastre directo de pines y fichas
    this.draggedPin = null;
    this.draggedPinEl = null;
    this.isDraggingPin = false;
    this.dragPinStartClientX = 0;
    this.dragPinStartClientY = 0;
    this.dragPinHasMoved = false;
    this.suppressPinClickUntil = 0;

    // Modo actual: 'explore' | 'add_pin' | 'measure' | 'move_party'
    this.mode = "explore";
    this.activeIconType = "camp";

    // Punteros y gestos
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragStartTranslateX = 0;
    this.dragStartTranslateY = 0;
    this.hasMovedSignificant = false;

    // Gestos táctiles
    this.activeTouches = new Map();
    this.initialPinchDistance = null;
    this.initialPinchScale = null;

    this.markers = [];
    this.selectedMarkerId = null;

    // Estado de medición y camino por etapas
    this.routePoints = [];
    this.savedRoute = null;
    this.lastClickHexId = null;
    this.lastClickTime = 0;

    this.initEvents();
  }

  initEvents() {
    // --- Eventos de Ratón ---
    this.viewportEl.addEventListener("wheel", (e) => this.handleWheel(e), { passive: false });
    this.viewportEl.addEventListener("mousedown", (e) => this.handleMouseDown(e));
    window.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    window.addEventListener("mouseup", (e) => this.handleMouseUp(e));

    // --- Eventos Táctiles (Móvil / Tablet) ---
    this.viewportEl.addEventListener("touchstart", (e) => this.handleTouchStart(e), { passive: false });
    window.addEventListener("touchmove", (e) => this.handleTouchMove(e), { passive: false });
    window.addEventListener("touchend", (e) => this.handleTouchEnd(e));
    window.addEventListener("touchcancel", (e) => this.handleTouchEnd(e));

    // Ajuste inicial de zoom cuando carga la imagen
    if (this.mapImageEl.complete) {
      this.centerView();
    } else {
      this.mapImageEl.addEventListener("load", () => this.centerView());
    }

    window.addEventListener("resize", () => this.applyTransform());

    this.viewportEl.addEventListener("dblclick", (e) => this.handleDoubleClick(e));

    this.viewportEl.addEventListener("mouseleave", () => {
      if (this.mode === "measure") {
        if (this.routePoints.length === 0) {
          this.clearActiveMeasurement();
        } else {
          this.drawActiveRouteWithPreview(null);
        }
      }
    });
  }

  setMode(mode, iconType = "camp") {
    this.mode = mode;
    this.activeIconType = iconType;

    if (mode === "add_pin" || mode === "measure" || mode === "move_party" || mode === "move_marker") {
      this.viewportEl.classList.add("cursor-crosshair");
      this.viewportEl.classList.remove("cursor-grab", "cursor-grabbing");
    } else {
      this.viewportEl.classList.remove("cursor-crosshair");
      this.viewportEl.classList.add("cursor-grab");
    }

    if (mode !== "measure") {
      this.clearActiveMeasurement();
    } else {
      // Al entrar en modo camino: si ya hay una ruta guardada, permitir editarla o verla
      if (this.savedRoute && this.savedRoute.points && this.savedRoute.points.length > 0) {
        this.routePoints = [...this.savedRoute.points];
        if (this.onRouteUpdate) {
          const calc = this.calculateRouteDistance(this.routePoints);
          this.onRouteUpdate({ points: this.routePoints, ...calc });
        }
      }
    }
  }

  centerView() {
    const vRect = this.viewportEl.getBoundingClientRect();
    const naturalW = this.mapImageEl.naturalWidth || 2816;
    const naturalH = this.mapImageEl.naturalHeight || 2048;

    const scaleX = vRect.width / naturalW;
    const scaleY = vRect.height / naturalH;
    this.scale = Math.max(Math.min(scaleX, scaleY) * 1.15, 0.45);

    // Centrar inicialmente cerca de Port Nyanzaru (zona superior derecha)
    this.translateX = -(naturalW * 0.75 * this.scale - vRect.width * 0.5);
    this.translateY = -(naturalH * 0.15 * this.scale - vRect.height * 0.35);

    this.applyTransform();
  }

  applyTransform() {
    this.mapContainerEl.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
  }

  handleWheel(e) {
    e.preventDefault();
    const vRect = this.viewportEl.getBoundingClientRect();
    const mouseX = e.clientX - vRect.left;
    const mouseY = e.clientY - vRect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newScale = Math.min(Math.max(this.scale * zoomFactor, this.minScale), this.maxScale);

    if (newScale !== this.scale) {
      this.translateX = mouseX - (mouseX - this.translateX) * (newScale / this.scale);
      this.translateY = mouseY - (mouseY - this.translateY) * (newScale / this.scale);
      this.scale = newScale;
      this.applyTransform();
    }
  }

  handleMouseDown(e) {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.hasMovedSignificant = false;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.dragStartTranslateX = this.translateX;
    this.dragStartTranslateY = this.translateY;
    this.viewportEl.classList.add("cursor-grabbing");
  }

  startPinDrag(marker, pinEl, clientX, clientY) {
    this.draggedPin = { type: "marker", data: marker };
    this.draggedPinEl = pinEl;
    this.isDraggingPin = true;
    this.dragPinStartClientX = clientX;
    this.dragPinStartClientY = clientY;
    this.dragPinHasMoved = false;
  }

  startPartyDrag(partyPos, partyEl, clientX, clientY) {
    this.draggedPin = { type: "party", data: partyPos };
    this.draggedPinEl = partyEl;
    this.isDraggingPin = true;
    this.dragPinStartClientX = clientX;
    this.dragPinStartClientY = clientY;
    this.dragPinHasMoved = false;
  }

  handleMouseMove(e) {
    // Si estamos arrastrando un marcador o ficha
    if (this.isDraggingPin && this.draggedPinEl) {
      const dist = Math.hypot(e.clientX - this.dragPinStartClientX, e.clientY - this.dragPinStartClientY);
      if (dist > 5) {
        this.dragPinHasMoved = true;
        this.draggedPinEl.classList.add("is-dragging");
      }
      if (this.dragPinHasMoved) {
        const coords = this.screenToMapPercent(e.clientX, e.clientY);
        if (coords) {
          this.draggedPinEl.style.left = `${coords.x}%`;
          this.draggedPinEl.style.top = `${coords.y}%`;
          const pxX = (coords.x / 100) * 2816;
          const pxY = (coords.y / 100) * 2048;
          const snap = this.snapToHexCenter(pxX, pxY);
          if (snap) {
            this.drawHoverHex(snap);
          }
        }
      }
      return;
    }

    // Si estamos en modo camino/regla sin arrastrar, previsualizar snap al hexágono y paso
    if (this.mode === "measure" && !this.isDragging) {
      const coords = this.screenToMapPercent(e.clientX, e.clientY);
      if (coords) {
        const curPxX = (coords.x / 100) * 2816;
        const curPxY = (coords.y / 100) * 2048;
        const snapped = this.snapToHexCenter(curPxX, curPxY);

        if (snapped) {
          if (this.routePoints.length === 0) {
            this.drawHoverHex(snapped);
          } else {
            this.drawActiveRouteWithPreview(snapped);
          }
        }
      }
    }

    if (!this.isDragging) return;
    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      this.hasMovedSignificant = true;
    }

    this.translateX = this.dragStartTranslateX + dx;
    this.translateY = this.dragStartTranslateY + dy;
    this.applyTransform();
  }

  handleMouseUp(e) {
    if (this.isDraggingPin) {
      const dragged = this.draggedPin;
      const pinEl = this.draggedPinEl;
      const hasMoved = this.dragPinHasMoved;

      this.isDraggingPin = false;
      this.draggedPin = null;
      this.draggedPinEl = null;
      this.dragPinHasMoved = false;

      if (pinEl) pinEl.classList.remove("is-dragging");
      this.clearActiveMeasurement();

      if (hasMoved) {
        this.suppressPinClickUntil = Date.now() + 250;
        const coords = this.screenToMapPercent(e.clientX, e.clientY);
        if (coords) {
          const pxX = (coords.x / 100) * 2816;
          const pxY = (coords.y / 100) * 2048;
          const snap = this.snapToHexCenter(pxX, pxY);
          const finalX = snap ? snap.percentX : coords.x;
          const finalY = snap ? snap.percentY : coords.y;

          if (dragged.type === "marker") {
            if (this.onMarkerMove) {
              this.onMarkerMove(dragged.data.id, finalX, finalY, snap ? snap.hexId : null);
            }
          } else if (dragged.type === "party") {
            if (this.onMovePartyClick) {
              this.onMovePartyClick(finalX, finalY);
            }
          }
        }
      }
      return;
    }

    if (!this.isDragging) return;
    this.isDragging = false;
    this.viewportEl.classList.remove("cursor-grabbing");

    if (!this.hasMovedSignificant) {
      this.processMapClick(e.clientX, e.clientY);
    }
  }

  // --- Manejo Táctil Móvil ---
  handleTouchStart(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      this.activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
    }

    if (this.activeTouches.size === 1) {
      const t = e.touches[0];
      this.isDragging = true;
      this.hasMovedSignificant = false;
      this.dragStartX = t.clientX;
      this.dragStartY = t.clientY;
      this.dragStartTranslateX = this.translateX;
      this.dragStartTranslateY = this.translateY;
    } else if (this.activeTouches.size === 2) {
      this.isDragging = false;
      const [t1, t2] = Array.from(this.activeTouches.values());
      this.initialPinchDistance = Math.hypot(t2.x - t1.x, t2.y - t1.y);
      this.initialPinchScale = this.scale;
    }
  }

  handleTouchMove(e) {
    if (this.isDraggingPin && this.draggedPinEl && e.touches.length === 1) {
      e.preventDefault();
      const t = e.touches[0];
      const dist = Math.hypot(t.clientX - this.dragPinStartClientX, t.clientY - this.dragPinStartClientY);
      if (dist > 6) {
        this.dragPinHasMoved = true;
        this.draggedPinEl.classList.add("is-dragging");
      }
      if (this.dragPinHasMoved) {
        const coords = this.screenToMapPercent(t.clientX, t.clientY);
        if (coords) {
          this.draggedPinEl.style.left = `${coords.x}%`;
          this.draggedPinEl.style.top = `${coords.y}%`;
          const pxX = (coords.x / 100) * 2816;
          const pxY = (coords.y / 100) * 2048;
          const snap = this.snapToHexCenter(pxX, pxY);
          if (snap) {
            this.drawHoverHex(snap);
          }
        }
      }
      return;
    }

    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      this.activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
    }

    if (this.activeTouches.size === 1 && this.isDragging) {
      const t = e.touches[0];
      const dx = t.clientX - this.dragStartX;
      const dy = t.clientY - this.dragStartY;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        this.hasMovedSignificant = true;
      }
      this.translateX = this.dragStartTranslateX + dx;
      this.translateY = this.dragStartTranslateY + dy;
      this.applyTransform();
    } else if (this.activeTouches.size === 2 && this.initialPinchDistance) {
      const [t1, t2] = Array.from(this.activeTouches.values());
      const currentDist = Math.hypot(t2.x - t1.x, t2.y - t1.y);
      const ratio = currentDist / this.initialPinchDistance;

      const newScale = Math.min(Math.max(this.initialPinchScale * ratio, this.minScale), this.maxScale);

      const vRect = this.viewportEl.getBoundingClientRect();
      const midX = (t1.x + t2.x) / 2 - vRect.left;
      const midY = (t1.y + t2.y) / 2 - vRect.top;

      this.translateX = midX - (midX - this.translateX) * (newScale / this.scale);
      this.translateY = midY - (midY - this.translateY) * (newScale / this.scale);
      this.scale = newScale;
      this.applyTransform();
    }
  }

  handleTouchEnd(e) {
    if (this.isDraggingPin) {
      const dragged = this.draggedPin;
      const pinEl = this.draggedPinEl;
      const hasMoved = this.dragPinHasMoved;

      this.isDraggingPin = false;
      this.draggedPin = null;
      this.draggedPinEl = null;
      this.dragPinHasMoved = false;

      if (pinEl) pinEl.classList.remove("is-dragging");
      this.clearActiveMeasurement();

      if (hasMoved && e.changedTouches && e.changedTouches.length > 0) {
        this.suppressPinClickUntil = Date.now() + 250;
        const t = e.changedTouches[0];
        const coords = this.screenToMapPercent(t.clientX, t.clientY);
        if (coords) {
          const pxX = (coords.x / 100) * 2816;
          const pxY = (coords.y / 100) * 2048;
          const snap = this.snapToHexCenter(pxX, pxY);
          const finalX = snap ? snap.percentX : coords.x;
          const finalY = snap ? snap.percentY : coords.y;

          if (dragged.type === "marker") {
            if (this.onMarkerMove) {
              this.onMarkerMove(dragged.data.id, finalX, finalY, snap ? snap.hexId : null);
            }
          } else if (dragged.type === "party") {
            if (this.onMovePartyClick) {
              this.onMovePartyClick(finalX, finalY);
            }
          }
        }
      }
      return;
    }

    for (let i = 0; i < e.changedTouches.length; i++) {
      this.activeTouches.delete(e.changedTouches[i].identifier);
    }

    if (this.activeTouches.size === 0) {
      if (this.isDragging && !this.hasMovedSignificant && e.changedTouches.length === 1) {
        const t = e.changedTouches[0];
        this.processMapClick(t.clientX, t.clientY);
      }
      this.isDragging = false;
      this.initialPinchDistance = null;
    } else if (this.activeTouches.size === 1) {
      const remaining = Array.from(this.activeTouches.values())[0];
      this.isDragging = true;
      this.hasMovedSignificant = true;
      this.dragStartX = remaining.x;
      this.dragStartY = remaining.y;
      this.dragStartTranslateX = this.translateX;
      this.dragStartTranslateY = this.translateY;
    }
  }

  processMapClick(clientX, clientY) {
    const target = document.elementFromPoint(clientX, clientY);
    if (target && target.closest(".map-marker-pin, .party-token-pin")) {
      return;
    }

    const coords = this.screenToMapPercent(clientX, clientY);
    if (!coords || coords.x < 0 || coords.x > 100 || coords.y < 0 || coords.y > 100) return;

    if (this.mode === "add_pin") {
      this.onMapClick(coords.x, coords.y, this.activeIconType);
    } else if (this.mode === "move_party") {
      if (this.onMovePartyClick) {
        this.onMovePartyClick(coords.x, coords.y);
      }
    } else if (this.mode === "move_marker") {
      if (this.onMoveMarkerClick) {
        this.onMoveMarkerClick(coords.x, coords.y);
      }
    } else if (this.mode === "measure") {
      const pxX = (coords.x / 100) * 2816;
      const pxY = (coords.y / 100) * 2048;
      const snapped = this.snapToHexCenter(pxX, pxY);
      if (!snapped) return;

      const now = Date.now();

      // Si ya hay puntos en el camino:
      if (this.routePoints.length > 0) {
        const lastPt = this.routePoints[this.routePoints.length - 1];

        // Si se hace clic en el mismo hexágono que el último punto, finaliza el camino
        if (lastPt.hexId === snapped.hexId) {
          if (this.routePoints.length >= 2) {
            this.finishRoute();
          }
          return;
        }

        // Si el intervalo entre clics es menor a 350ms, interpretar como doble clic y finalizar
        if (now - this.lastClickTime < 350 && this.routePoints.length >= 2) {
          this.finishRoute();
          return;
        }
      }

      this.routePoints.push(snapped);
      this.lastClickHexId = snapped.hexId;
      this.lastClickTime = now;

      this.drawActiveRouteWithPreview(snapped);

      if (this.onRouteUpdate) {
        const calc = this.calculateRouteDistance(this.routePoints);
        this.onRouteUpdate({ points: this.routePoints, ...calc });
      }
    }
  }

  handleDoubleClick(e) {
    if (this.mode === "measure") {
      e.preventDefault();
      e.stopPropagation();
      if (this.routePoints.length >= 2) {
        this.finishRoute();
      }
    }
  }

  screenToMapPercent(clientX, clientY) {
    const imgRect = this.mapImageEl.getBoundingClientRect();
    if (!imgRect.width || !imgRect.height) return null;

    const x = ((clientX - imgRect.left) / imgRect.width) * 100;
    const y = ((clientY - imgRect.top) / imgRect.height) * 100;

    return {
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100
    };
  }

  // Centrar y enfocar un marcador específico
  focusOnMarker(percentX, percentY, targetScale = 1.3) {
    const vRect = this.viewportEl.getBoundingClientRect();
    const naturalW = this.mapImageEl.naturalWidth || 2816;
    const naturalH = this.mapImageEl.naturalHeight || 2048;

    this.scale = targetScale;
    const mapPxX = (percentX / 100) * naturalW;
    const mapPxY = (percentY / 100) * naturalH;

    this.translateX = vRect.width * 0.5 - mapPxX * this.scale;
    this.translateY = vRect.height * 0.5 - mapPxY * this.scale;

    this.applyTransform();
  }

  zoomIn() {
    const vRect = this.viewportEl.getBoundingClientRect();
    const cx = vRect.width / 2;
    const cy = vRect.height / 2;
    const newScale = Math.min(this.scale * 1.3, this.maxScale);
    this.translateX = cx - (cx - this.translateX) * (newScale / this.scale);
    this.translateY = cy - (cy - this.translateY) * (newScale / this.scale);
    this.scale = newScale;
    this.applyTransform();
  }

  zoomOut() {
    const vRect = this.viewportEl.getBoundingClientRect();
    const cx = vRect.width / 2;
    const cy = vRect.height / 2;
    const newScale = Math.max(this.scale / 1.3, this.minScale);
    this.translateX = cx - (cx - this.translateX) * (newScale / this.scale);
    this.translateY = cy - (cy - this.translateY) * (newScale / this.scale);
    this.scale = newScale;
    this.applyTransform();
  }

  // --- Geometría y Snap Hexagonal ---
  snapToHexCenter(pxX, pxY) {
    const colDx = 110.85125168440817; // 192 / Math.sqrt(3)
    const col0X = 36.5;
    const totalCols = 26;

    let best = null;
    let minDistanceSq = Infinity;

    const cEst = Math.round((pxX - col0X) / colDx);
    const cCandidates = [cEst - 1, cEst, cEst + 1].filter((c) => c >= 0 && c < totalCols);

    for (const c of cCandidates) {
      const cx = col0X + c * colDx;
      const isEvenCol = c % 2 === 0;

      if (isEvenCol) {
        // Columnas pares de índice (01, 03, 05...): Filas 01 a 16: cy = 63 + r * 128 (r = 0..15)
        const rEst = Math.round((pxY - 63.0) / 128.0);
        const rCandidates = [rEst - 1, rEst, rEst + 1].filter((r) => r >= 0 && r <= 15);

        for (const r of rCandidates) {
          const cy = 63.0 + r * 128.0;
          const distSq = (pxX - cx) ** 2 + (pxY - cy) ** 2;
          if (distSq < minDistanceSq) {
            minDistanceSq = distSq;
            const colNum = c + 1;
            const rowNum = r + 1;
            const hexId = `${String(colNum).padStart(2, "0")}${String(rowNum).padStart(2, "0")}`;
            best = {
              x: cx,
              y: cy,
              percentX: Math.round(((cx / 2816) * 100) * 100) / 100,
              percentY: Math.round(((cy / 2048) * 100) * 100) / 100,
              hexId,
              col: colNum,
              row: rowNum,
              distFromCursor: Math.sqrt(distSq)
            };
          }
        }
      } else {
        // Columnas impares de índice (02, 04, 06...): Filas 01 a 17: cy = -1 + r * 128 (r = 0..16)
        const rEst = Math.round((pxY - (-1.0)) / 128.0);
        const rCandidates = [rEst - 1, rEst, rEst + 1].filter((r) => r >= 0 && r <= 16);

        for (const r of rCandidates) {
          const cy = -1.0 + r * 128.0;
          const distSq = (pxX - cx) ** 2 + (pxY - cy) ** 2;
          if (distSq < minDistanceSq) {
            minDistanceSq = distSq;
            const colNum = c + 1;
            const rowNum = r + 1;
            const hexId = `${String(colNum).padStart(2, "0")}${String(rowNum).padStart(2, "0")}`;
            best = {
              x: cx,
              y: cy,
              percentX: Math.round(((cx / 2816) * 100) * 100) / 100,
              percentY: Math.round(((cy / 2048) * 100) * 100) / 100,
              hexId,
              col: colNum,
              row: rowNum,
              distFromCursor: Math.sqrt(distSq)
            };
          }
        }
      }
    }

    return best;
  }

  getHexPolygonPoints(cx, cy) {
    const R = 73.900826; // 128 / Math.sqrt(3)
    const halfR = R / 2;
    const halfH = 64.0;
    // 6 vértices en sentido horario para hexágono flat-topped (borde sup e inf horizontales):
    return [
      `${(cx + R).toFixed(1)},${cy.toFixed(1)}`,
      `${(cx + halfR).toFixed(1)},${(cy - halfH).toFixed(1)}`,
      `${(cx - halfR).toFixed(1)},${(cy - halfH).toFixed(1)}`,
      `${(cx - R).toFixed(1)},${cy.toFixed(1)}`,
      `${(cx - halfR).toFixed(1)},${(cy + halfH).toFixed(1)}`,
      `${(cx + halfR).toFixed(1)},${(cy + halfH).toFixed(1)}`
    ].join(" ");
  }

  // --- Herramienta de Camino / Regla Multi-etapa ---
  setSavedRoute(routeData) {
    this.savedRoute = routeData;
    this.renderSavedRoute();
  }

  calculateDistance(x1, y1, x2, y2) {
    const distPx = Math.hypot(x2 - x1, y2 - y1);
    // 128 px = distancia exacta entre centros adyacentes = 1 hexágono = 3 millas
    const rawHexes = distPx / 128.0;
    const hexes = Math.round(rawHexes * 10) / 10;
    const miles = Math.round((hexes * 3.0) * 10) / 10;

    return {
      hexes,
      miles,
      distPx
    };
  }

  calculateRouteDistance(points) {
    if (!points || points.length < 2) {
      return { totalHexes: 0, totalMiles: 0, segments: [] };
    }
    let totalHexes = 0;
    const segments = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dist = this.calculateDistance(p1.x, p1.y, p2.x, p2.y);
      totalHexes += dist.hexes;
      segments.push({ from: p1, to: p2, distPx: dist.distPx, hexes: dist.hexes, miles: dist.miles });
    }
    totalHexes = Math.round(totalHexes * 10) / 10;
    const totalMiles = Math.round((totalHexes * 3.0) * 10) / 10;
    return {
      totalHexes,
      totalMiles,
      segments,
      stepsCount: points.length
    };
  }

  drawHoverHex(snapped) {
    if (!this.measureSvgEl) return;
    this.measureSvgEl.innerHTML = `
      <g class="measure-group-hover">
        <polygon points="${this.getHexPolygonPoints(snapped.x, snapped.y)}" fill="none" style="fill: none !important;" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="6 4" />
        <circle cx="${snapped.x}" cy="${snapped.y}" r="8" fill="#38bdf8" stroke="#ffffff" stroke-width="2" />
        <circle cx="${snapped.x}" cy="${snapped.y}" r="3" fill="#ffffff" />
        <text x="${snapped.x}" y="${snapped.y - 18}" text-anchor="middle" class="measure-hex-label preview">HEX ${snapped.hexId}</text>
      </g>
    `;
    if (this.measureBadgeEl) {
      this.measureBadgeEl.style.left = `${(snapped.x / 2816) * 100}%`;
      this.measureBadgeEl.style.top = `${(snapped.y / 2048) * 100}%`;
      this.measureBadgeEl.innerHTML = `
        <span class="measure-hexes">Hex <strong>${snapped.hexId}</strong></span>
        <span class="measure-sep">•</span>
        <span class="measure-prompt">Clic para iniciar camino</span>
      `;
      this.measureBadgeEl.classList.remove("hidden");
    }
  }

  drawActiveRouteWithPreview(hoverHex) {
    if (!this.measureSvgEl) return;
    if (this.routePoints.length === 0) {
      if (hoverHex) this.drawHoverHex(hoverHex);
      return;
    }

    const points = [...this.routePoints];
    const lastConfirmed = points[points.length - 1];
    const isHoveringOtherHex = hoverHex && hoverHex.hexId !== lastConfirmed.hexId;

    let allPoints = points;
    if (isHoveringOtherHex) {
      allPoints = [...points, hoverHex];
    }

    const calc = this.calculateRouteDistance(allPoints);
    const confirmedCalc = this.calculateRouteDistance(points);

    // Solo dibujamos el contorno hueco (fill: none) del hexágono donde se encuentra el cursor
    let hoverOutlineHtml = "";
    if (isHoveringOtherHex) {
      hoverOutlineHtml = `<polygon points="${this.getHexPolygonPoints(hoverHex.x, hoverHex.y)}" fill="none" style="fill: none !important;" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="6 4" />`;
    }

    // Líneas del camino (sin sombras negras gruesas ni rellenos opacos)
    let linesHtml = "";
    if (points.length >= 2) {
      const confirmedPtsStr = points.map((p) => `${p.x},${p.y}`).join(" ");
      linesHtml += `<polyline points="${confirmedPtsStr}" class="route-polyline-trail" fill="none" style="fill: none !important;" />`;
    }

    if (isHoveringOtherHex) {
      linesHtml += `
        <line x1="${lastConfirmed.x}" y1="${lastConfirmed.y}" x2="${hoverHex.x}" y2="${hoverHex.y}" class="measure-line preview" style="fill: none !important;" />
      `;
    }

    // Nodos en los centros de los hexágonos con anillos blancos y etiquetas legibles
    let nodesHtml = "";
    points.forEach((p, idx) => {
      if (idx === 0) {
        nodesHtml += `
          <circle cx="${p.x}" cy="${p.y}" r="11" fill="#22c55e" stroke="#ffffff" stroke-width="2.5" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.7))" />
          <circle cx="${p.x}" cy="${p.y}" r="4" fill="#ffffff" />
          <text x="${p.x}" y="${p.y - 18}" text-anchor="middle" class="route-node-label start">INICIO (1)</text>
        `;
      } else if (idx === points.length - 1 && !isHoveringOtherHex) {
        nodesHtml += `
          <circle cx="${p.x}" cy="${p.y}" r="11" fill="#ef4444" stroke="#ffffff" stroke-width="2.5" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.7))" />
          <circle cx="${p.x}" cy="${p.y}" r="4" fill="#ffffff" />
          <text x="${p.x}" y="${p.y - 18}" text-anchor="middle" class="route-node-label end">FIN (${idx + 1})</text>
        `;
      } else {
        nodesHtml += `
          <circle cx="${p.x}" cy="${p.y}" r="9" fill="#f59e0b" stroke="#ffffff" stroke-width="2" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.7))" />
          <circle cx="${p.x}" cy="${p.y}" r="3" fill="#ffffff" />
          <text x="${p.x}" y="${p.y - 16}" text-anchor="middle" class="route-node-label">${idx + 1}</text>
        `;
      }
    });

    if (isHoveringOtherHex) {
      nodesHtml += `
        <circle cx="${hoverHex.x}" cy="${hoverHex.y}" r="9" fill="#38bdf8" stroke="#ffffff" stroke-width="2" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.7))" />
        <circle cx="${hoverHex.x}" cy="${hoverHex.y}" r="3" fill="#ffffff" />
        <text x="${hoverHex.x}" y="${hoverHex.y - 18}" text-anchor="middle" class="measure-hex-label preview">${points.length + 1}</text>
      `;
    }

    this.measureSvgEl.innerHTML = `
      <g class="measure-group">
        ${hoverOutlineHtml}
        ${linesHtml}
        ${nodesHtml}
      </g>
    `;

    // Insignia flotante de medición
    if (this.measureBadgeEl) {
      let badgeX = lastConfirmed.x;
      let badgeY = lastConfirmed.y;
      if (isHoveringOtherHex) {
        badgeX = (lastConfirmed.x + hoverHex.x) / 2;
        badgeY = (lastConfirmed.y + hoverHex.y) / 2;
        const stepDist = this.calculateDistance(lastConfirmed.x, lastConfirmed.y, hoverHex.x, hoverHex.y);
        this.measureBadgeEl.innerHTML = `
          <span class="measure-hexes"><strong>+${stepDist.hexes}</strong> hex</span>
          <span class="measure-sep">•</span>
          <span class="measure-miles">Total: <strong>${calc.totalHexes}</strong> hex (${calc.totalMiles} mi)</span>
          <span class="measure-tag">Paso ${allPoints.length}</span>
        `;
      } else {
        this.measureBadgeEl.innerHTML = `
          <span class="measure-hexes"><strong>${confirmedCalc.totalHexes}</strong> hex</span>
          <span class="measure-sep">•</span>
          <span class="measure-miles"><strong>${confirmedCalc.totalMiles}</strong> millas</span>
          <span class="measure-tag">${points.length} etapas</span>
        `;
      }

      this.measureBadgeEl.style.left = `${(badgeX / 2816) * 100}%`;
      this.measureBadgeEl.style.top = `${(badgeY / 2048) * 100}%`;
      this.measureBadgeEl.classList.remove("hidden");
    }
  }

  undoRouteStep() {
    if (this.routePoints.length > 0) {
      this.routePoints.pop();
      if (this.routePoints.length === 0) {
        this.clearActiveMeasurement();
      } else {
        this.drawActiveRouteWithPreview(this.routePoints[this.routePoints.length - 1]);
      }
      if (this.onRouteUpdate) {
        const calc = this.calculateRouteDistance(this.routePoints);
        this.onRouteUpdate({ points: this.routePoints, ...calc });
      }
    }
  }

  finishRoute() {
    if (this.routePoints.length < 2) {
      return null;
    }
    const calc = this.calculateRouteDistance(this.routePoints);
    const routeData = {
      points: [...this.routePoints],
      totalHexes: calc.totalHexes,
      totalMiles: calc.totalMiles,
      date: Date.now()
    };
    this.savedRoute = routeData;
    this.renderSavedRoute();
    this.clearActiveMeasurement();

    if (this.onRouteFinish) {
      this.onRouteFinish(routeData);
    }
    return routeData;
  }

  clearRoute() {
    this.routePoints = [];
    this.savedRoute = null;
    if (this.routeSvgEl) this.routeSvgEl.innerHTML = "";
    if (this.routeBadgeEl) this.routeBadgeEl.classList.add("hidden");
    this.clearActiveMeasurement();
    if (this.onRouteUpdate) {
      this.onRouteUpdate(null);
    }
  }

  renderSavedRoute() {
    if (!this.routeSvgEl) return;
    if (!this.savedRoute || !this.savedRoute.points || this.savedRoute.points.length < 2) {
      this.routeSvgEl.innerHTML = "";
      if (this.routeBadgeEl) this.routeBadgeEl.classList.add("hidden");
      return;
    }

    const points = this.savedRoute.points;
    const calc = this.calculateRouteDistance(points);

    // Líneas del camino persistente (sin polígonos rellenos ni sombras negras)
    const ptsStr = points.map((p) => `${p.x},${p.y}`).join(" ");
    const linesHtml = `<polyline points="${ptsStr}" class="route-polyline-trail" fill="none" style="fill: none !important;" />`;

    let nodesHtml = "";
    points.forEach((p, idx) => {
      if (idx === 0) {
        nodesHtml += `
          <circle cx="${p.x}" cy="${p.y}" r="12" fill="#22c55e" stroke="#ffffff" stroke-width="2.5" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.7))" />
          <circle cx="${p.x}" cy="${p.y}" r="4" fill="#ffffff" />
          <text x="${p.x}" y="${p.y - 18}" text-anchor="middle" class="route-node-label start">INICIO (1)</text>
        `;
      } else if (idx === points.length - 1) {
        nodesHtml += `
          <circle cx="${p.x}" cy="${p.y}" r="12" fill="#ef4444" stroke="#ffffff" stroke-width="2.5" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.7))" />
          <circle cx="${p.x}" cy="${p.y}" r="4" fill="#ffffff" />
          <text x="${p.x}" y="${p.y - 18}" text-anchor="middle" class="route-node-label end">FIN (${idx + 1})</text>
        `;
      } else {
        nodesHtml += `
          <circle cx="${p.x}" cy="${p.y}" r="9" fill="#f59e0b" stroke="#ffffff" stroke-width="2" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.7))" />
          <circle cx="${p.x}" cy="${p.y}" r="3" fill="#ffffff" />
          <text x="${p.x}" y="${p.y - 16}" text-anchor="middle" class="route-node-label">${idx + 1}</text>
        `;
      }
    });

    this.routeSvgEl.innerHTML = `
      <g class="saved-route-group">
        ${linesHtml}
        ${nodesHtml}
      </g>
    `;

    if (this.routeBadgeEl) {
      const lastPt = points[points.length - 1];
      this.routeBadgeEl.style.left = `${(lastPt.x / 2816) * 100}%`;
      this.routeBadgeEl.style.top = `${(lastPt.y / 2048) * 100}%`;
      this.routeBadgeEl.innerHTML = `
        <span class="route-badge-icon">🗺️</span>
        <span class="route-badge-text"><strong>${calc.totalHexes}</strong> hex • <strong>${calc.totalMiles}</strong> millas (${points.length} etapas)</span>
        <button type="button" class="route-badge-btn-delete" title="Borrar este camino">🗑️ Borrar</button>
      `;
      this.routeBadgeEl.classList.remove("hidden");

      const delBtn = this.routeBadgeEl.querySelector(".route-badge-btn-delete");
      if (delBtn) {
        delBtn.onclick = (e) => {
          e.stopPropagation();
          if (this.onRouteDelete) {
            this.onRouteDelete();
          } else {
            this.clearRoute();
          }
        };
      }

      this.routeBadgeEl.onclick = (e) => {
        if (e.target.closest(".route-badge-btn-delete")) return;
        if (this.onRouteBadgeClick) {
          this.onRouteBadgeClick();
        }
      };
    }
  }

  clearActiveMeasurement() {
    this.routePoints = [];
    if (this.measureSvgEl) this.measureSvgEl.innerHTML = "";
    if (this.measureBadgeEl) this.measureBadgeEl.classList.add("hidden");
  }

  clearMeasurement() {
    this.clearActiveMeasurement();
  }

  // --- Token del Grupo de Aventureros ---
  renderPartyToken(partyPos, onPartyClick) {
    if (!this.partyLayerEl) return;
    this.partyLayerEl.innerHTML = "";
    if (!partyPos) return;

    const pxX = (partyPos.x / 100) * 2816;
    const pxY = (partyPos.y / 100) * 2048;
    const snap = this.snapToHexCenter(pxX, pxY);
    const hexTag = snap ? `(Hex #${snap.hexId})` : "";
    const hasNote = Boolean(partyPos.note && partyPos.note.trim());
    const isTopArea = partyPos.y < 15;

    const partyEl = document.createElement("div");
    partyEl.className = "party-token-pin";
    partyEl.id = "party-token-node";
    partyEl.style.left = `${partyPos.x}%`;
    partyEl.style.top = `${partyPos.y}%`;

    partyEl.innerHTML = `
      <div class="party-pulse-ring"></div>
      <div class="party-badge" title="Grupo de Aventureros ${hexTag}">
        <div class="party-badge-inner">
          ${PARTY_TOKEN_DATA.svg}
        </div>
        <span class="party-tag">GRUPO</span>
      </div>
      <div class="pin-popup ${isTopArea ? "popup-bottom" : ""}">
        <div class="pin-popup-header">
          <div class="pin-popup-title-wrap">
            <span class="pin-popup-icon-wrap" style="color: ${PARTY_TOKEN_DATA.color};">${PARTY_TOKEN_DATA.svg}</span>
            <span class="pin-popup-title">Grupo de Aventureros</span>
          </div>
          ${hexTag ? `<span class="pin-popup-day">${hexTag}</span>` : ""}
        </div>
        <div class="pin-popup-notes">${escapeHtml(hasNote ? partyPos.note : "Campamento base en expedición activa.")}</div>
        <div class="pin-popup-arrow"></div>
      </div>
    `;

    // Soporte para arrastrar ficha del grupo
    partyEl.addEventListener("mousedown", (e) => {
      if (e.button !== 0 || this.mode !== "explore") return;
      e.stopPropagation();
      this.startPartyDrag(partyPos, partyEl, e.clientX, e.clientY);
    });

    partyEl.addEventListener("touchstart", (e) => {
      if (this.mode !== "explore" || e.touches.length !== 1) return;
      e.stopPropagation();
      const t = e.touches[0];
      this.startPartyDrag(partyPos, partyEl, t.clientX, t.clientY);
    }, { passive: false });

    partyEl.addEventListener("click", (e) => {
      e.stopPropagation();
      if (Date.now() < this.suppressPinClickUntil) return;
      if (onPartyClick) onPartyClick(partyPos);
    });

    this.partyLayerEl.appendChild(partyEl);
  }

  // --- Capa de Marcadores ---
  renderMarkers(markers, activeFilterType = "all", hideResolved = false) {
    this.markers = markers;
    this.markersLayerEl.innerHTML = "";

    markers.forEach((marker) => {
      if (activeFilterType !== "all" && marker.icon !== activeFilterType) {
        return;
      }
      if (hideResolved && marker.resolved) {
        return;
      }

      const typeInfo = getMarkerType(marker.icon);
      const pinEl = document.createElement("div");
      pinEl.className = `map-marker-pin ${marker.resolved ? "resolved" : ""}`;
      pinEl.dataset.id = marker.id;
      pinEl.style.left = `${marker.x}%`;
      pinEl.style.top = `${marker.y}%`;
      pinEl.style.setProperty("--pin-color", typeInfo.color);
      pinEl.style.setProperty("--pin-bg", typeInfo.bgColor);

      const hasTitle = Boolean(marker.title && marker.title.trim());
      const hasNotes = Boolean(marker.notes && marker.notes.trim());
      const hasPopup = hasTitle || hasNotes;
      const isTopArea = marker.y < 15;

      const popupHtml = hasPopup ? `
        <div class="pin-popup ${isTopArea ? "popup-bottom" : ""}">
          <div class="pin-popup-header">
            <div class="pin-popup-title-wrap">
              <span class="pin-popup-icon-wrap" style="color: ${typeInfo.color};">${typeInfo.svg}</span>
              <span class="pin-popup-title">${escapeHtml(hasTitle ? marker.title : typeInfo.label)}</span>
            </div>
            ${marker.day ? `<span class="pin-popup-day">${escapeHtml(marker.day)}</span>` : ""}
          </div>
          ${hasNotes ? `<div class="pin-popup-notes">${escapeHtml(marker.notes)}</div>` : ""}
          ${marker.resolved ? `<div class="pin-popup-status">✓ Resuelto / Superado</div>` : ""}
          <div class="pin-popup-arrow"></div>
        </div>
      ` : "";

      pinEl.innerHTML = `
        <div class="pin-badge" title="${escapeHtml(marker.title || typeInfo.label)}">
          <div class="pin-badge-inner">
            ${typeInfo.svg}
          </div>
        </div>
        ${marker.resolved ? '<span class="pin-check">✓</span>' : ""}
        ${popupHtml}
      `;

      // Soporte para arrastrar marcador
      pinEl.addEventListener("mousedown", (e) => {
        if (e.button !== 0 || this.mode !== "explore") return;
        e.stopPropagation();
        this.startPinDrag(marker, pinEl, e.clientX, e.clientY);
      });

      pinEl.addEventListener("touchstart", (e) => {
        if (this.mode !== "explore" || e.touches.length !== 1) return;
        e.stopPropagation();
        const t = e.touches[0];
        this.startPinDrag(marker, pinEl, t.clientX, t.clientY);
      }, { passive: false });

      pinEl.addEventListener("click", (e) => {
        e.stopPropagation();
        if (Date.now() < this.suppressPinClickUntil) return;
        this.selectedMarkerId = marker.id;
        this.onMarkerClick(marker);
      });

      this.markersLayerEl.appendChild(pinEl);
    });
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

# Informe de Rendimiento y Presupuesto Gráfico · CHISPA ∞ (`v1.1.0`)

Este documento recoge la arquitectura de renderizado en GPU y las **mediciones reales sin redondear** obtenidas mediante `scripts/benchmark-g7.ts` (Playwright + Chromium/Edge CDP) con **las 16 órbitas llenas (14 cuerpos por órbita = 224 cuerpos principales + 3.460 sub-estrellas instanciadas)** y **hasta 50.000 partículas activas en GPU**.

---

## 1. Mediciones Reales en los 3 Escenarios (`scripts/benchmark-g7.ts`)

Para evitar que el límite de refresco vertical del monitor (*VSync* a 165 Hz = `6,06 ms/frame`) oculte el coste real de CPU+WebGL bajo *throttling*, cada prueba mide **ambas métricas**:
1. **FPS y `ms/frame` reales con VSync** (muestreados durante `1.200 ms` tras `600 ms` de calentamiento).
2. **Trabajo activo de CPU+WebGL por fotograma (`workAvgMs` y `workP95Ms`)** midiendo `performance.now()` alrededor de `sim.tick(0.016) + scene.update(0.016) + renderer.render(stage)` a lo largo de 60 iteraciones consecutivas.

| Escenario | Calidad | Partículas GPU | Draw Calls | FPS Reales (VSync) | `ms/frame` (VSync) | P95 `ms/frame` (VSync) | Trabajo Activo Medio (`ms/frame`) | Trabajo Activo P95 (`ms/frame`) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| **1. Escritorio normal (`1920×1080`, CPU ×1)** | **Alta** | 50.000 | 18 | **165,07** | 6,06 ms | 6,30 ms | **0,69 ms** | 1,10 ms |
| **1. Escritorio normal (`1920×1080`, CPU ×1)** | **Media** | 15.000 | 14 | **165,32** | 6,06 ms | 6,70 ms | **0,72 ms** | 1,00 ms |
| **1. Escritorio normal (`1920×1080`, CPU ×1)** | **Baja** | 3.000 | 8 | **165,40** | 6,06 ms | 6,60 ms | **0,62 ms** | 0,90 ms |
| **2. Escritorio con CPU ×4 (`1920×1080`, CDP `rate: 4`)** | **Alta** | 50.000 | 18 | **165,06** | 6,06 ms | 6,20 ms | **3,67 ms** | 5,20 ms |
| **2. Escritorio con CPU ×4 (`1920×1080`, CDP `rate: 4`)** | **Media** | 15.000 | 14 | **165,05** | 6,06 ms | 6,20 ms | **3,97 ms** | 5,50 ms |
| **2. Escritorio con CPU ×4 (`1920×1080`, CDP `rate: 4`)** | **Baja** | 3.000 | 8 | **163,64** | 6,16 ms | 6,20 ms | **3,48 ms** | 4,90 ms |
| **3. Emulación móvil (`390×844` + CPU ×4)** | **Alta** | 50.000 | 18 | **164,99** | 6,06 ms | 6,20 ms | **4,00 ms** | 5,70 ms |
| **3. Emulación móvil (`390×844` + CPU ×4)** | **Media** | 15.000 | 14 | **165,01** | 6,06 ms | 6,20 ms | **4,13 ms** | 6,80 ms |
| **3. Emulación móvil (`390×844` + CPU ×4)** | **Baja** | 3.000 | 8 | **165,10** | 6,06 ms | 6,20 ms | **3,18 ms** | 4,60 ms |

### Interpretación Técnica de los Resultados
- **Efecto real del *CPU Throttling ×4*:** El tiempo de trabajo activo por fotograma pasa de **`0,62–0,72 ms`** (CPU ×1) a **`3,18–4,13 ms`** (CPU ×4), con un percentil 95 de **`4,60–6,80 ms`**. Esto representa un incremento medible de `~5,3×` en el tiempo de CPU por fotograma cuando se activa la estrangulación `×4` de DevTools.
- **Por qué se mantienen ≥ 60 FPS incluso con 50.000 partículas y CPU ×4:** Al seguir por debajo del presupuesto de `16,67 ms` (60 Hz) e incluso rozando el presupuesto de `6,06 ms` (165 Hz), el navegador sostiene la tasa máxima sin perder fotogramas porque las `50.000` partículas (`EffectsLayer.ts`) y las `3.460` sub-estrellas (`OrbitsLayer.ts`) **no se iteran en JavaScript**: sus posiciones keplerianas, turbulencia y amortiguamiento exponencial se calculan íntegramente en el *vertex shader* de la GPU.

---

## 2. Arquitectura de Optimización en GPU (`v1.1.0`)

1. **Sistema de 50.000 Partículas Analíticas en Vertex Shader (`src/render/EffectsLayer.ts`):**
   - `44.000` partículas de polvo orbital y cósmico viven permanentemente en VRAM (`topology: 'point-list'`). Su posición orbital 3D, inclinación y colapso durante el Big Bang se evalúan de forma cerrada en `GPU_PARTICLES_VERT` (`0` iteraciones en CPU por fotograma).
   - `6.000` ranuras adicionales actúan como *ring buffer* para ráfagas de clic, hitos y estelas de cometas con integración analítica de rozamiento ($x(t) = x_0 + v_0 \frac{1 - e^{-kt}}{k}$). Los buffers de vértices solo se suben a la GPU en el fotograma en que se emite una ráfaga nueva (`burstDirty`).
2. **Mallas Orbitales Agrupadas e Instanciación GPU (`src/render/OrbitsLayer.ts`):**
   - Los 16 tipos de cuerpos orbitales se empaquetan en dos únicas mallas (`backBodiesMesh` para $\sin\theta < 0$ y `frontBodiesMesh` para $\sin\theta \ge 0$, 1 *draw call* cada una), evaluando las 16 técnicas de *fragment/vertex shader* sin cambiar de programa GLSL.
   - Una tercera malla (`subCloudMesh`, 1 *draw call*) dibuja `3.200` estrellas espirales para las Galaxias (#8) y `260` galaxias satélite para los Cúmulos (#9) directamente en el *vertex shader*.
3. **Gobernador Dinámico de Calidad (`src/render/QualityGovernor.ts`):**

| Nivel | Escala de Resolución | Niveles de Bloom (*Dual Kawase*) | Partículas GPU | Lente / Destellos / *God Rays* | Grano y *Dithering* 1 LSB |
|---|---|---:|---:|---|---|
| **Alta** | `1.0` (máx DPR 2) | 5 niveles + HDR | 50.000 | Sí | Sí |
| **Media** | `0.75` | 3 niveles | 15.000 | No | Sí |
| **Baja** | `0.50` | 0 (desactivado) | 3.000 | No | No |

4. **Panel de Diagnóstico en Tiempo Real (`F3`):**
   - Pulsando `F3` en cualquier momento se muestra u oculta el panel `#f3-debug-panel` con `FPS`, `ms/frame`, `Renderer (WebGL2/WebGPU)`, `Draw Calls`, `Partículas GPU` y `Calidad`.

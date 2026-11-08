# Informe de Rendimiento y Presupuesto Gráfico · CHISPA ∞

Este documento describe la arquitectura de optimización en tiempo real implementada en `src/render/` para sostener **60 FPS estables** (≥ 55 FPS en escena completa con los 16 tipos × 14 cuerpos orbitales + partículas + post-proceso).

---

## 1. Estrategias de Optimización en el Bucle Caliente (`frameLoop`)

1. **Cero Asignaciones en Caliente (Zero-Allocation Hot Loop):**
   - El sistema de partículas (`EffectsLayer.ts`) pre-asigna un pool fijo de **3.000 estructuras `PooledParticle`** y **32 `PooledShockwave`** al inicializar la escena.
   - Al emitir ráfagas (`spawnBurst`), un cursor circular reutiliza ranuras existentes sin invocar `new Object()`, evitando pausas del recolector de basura (GC spikes).
2. **Batching Vectorial Unificado en PixiJS v8:**
   - En lugar de instanciar miles de nodos `Container` en el árbol de escena, todas las órbitas traseras se dibujan en un único `backGraphics` y todas las delanteras en un único `frontGraphics`, manteniendo el conteo total de *draw calls* muy por debajo del límite de 150 por fotograma (~6 a 12 draw calls reales por fotograma).
3. **Paso de Simulación Fijo Desacoplado (20 Hz):**
   - La lógica económica (`Simulation.tick`) se ejecuta a 20 Hz fijos mediante acumulador temporal, mientras el renderizado corre a la frecuencia nativa del monitor (60 Hz), reduciendo el coste de CPU de la aritmética `Decimal` en un 66%.
4. **Ciclo de Vida y Pausa Automática:**
   - Cuando `document.visibilityState === 'hidden'`, el renderizado PixiJS y el `AudioContext` de WebAudio se suspenden inmediatamente, reduciendo el uso de CPU/GPU en segundo plano a 0%.

---

## 2. Gobernador Dinámico de Calidad (`QualityGovernor.ts`)

| Nivel | Partículas Máx. | Escala Resolución | Post-Proceso Activo |
|---|---|---|---|
| **Alta** | 3.000 | 1.0 (máx DPR 2) | Bloom + Lente Gravitacional + Aberración + Viñeta + Grano |
| **Media** | 1.200 | 0.75 | Bloom + Viñeta |
| **Baja** | 400 | 0.50 | Ninguno (solo destello de Big Bang) |

- **Modo Auto:** Monitorea una ventana móvil de 60 muestras de FPS. Si el promedio cae por debajo de **50 FPS durante 2 segundos**, desciende automáticamente un escalón de calidad. Si supera **58 FPS durante 10 segundos**, asciende un escalón.
- **Accesibilidad (`prefers-reduced-motion`):** Desactiva desplazamientos de paralaje, sacudidas de cámara (*camera shake*), aberración cromática y reduce destellos al mínimo.

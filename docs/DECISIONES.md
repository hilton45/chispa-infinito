# Registro de Decisiones de Diseño y Arquitectura (ADR)

Este documento registra todas las decisiones arquitectónicas, de diseño y de balance tomadas durante el desarrollo de **CHISPA ∞**, indicando contexto, decisión, justificación y alternativas descartadas.

---

## ADR 001 · Estructura Base y Stack Tecnológico
- **Fecha:** Fase 0 (Inicio)
- **Estado:** Aprobado
- **Decisión:** 
  - Usar Vite + TypeScript estricto con `break_infinity.js` para números exponenciales sin límite en 1e308.
  - Usar PixiJS v8 para la capa de renderizado 2D/WebGL con shaders GLSL personalizados, manteniendo una capa DOM limpia y ultraligera para la UI (diseño en cristal, variables CSS).
  - WebAudio API pura para síntesis de audio procedural en tiempo real (música generativa y SFX).
  - `@fontsource/unbounded` y `@fontsource/sora` para tipografía local sin peticiones externas.
- **Motivo:** Máximo rendimiento (60 fps estables), cero dependencias de assets externos (imágenes/audio), desacoplamiento completo entre lógica económica y vista.
- **Alternativas descartadas:**
  - *React/Vue/Svelte:* Introducen sobrecarga de renderizado virtual DOM innecesario para un juego incremental donde los números se actualizan a 20-60 Hz y PixiJS maneja la animación gráfica.
  - *Archivos de sonido/sprites externos:* Violan el principio central del proyecto («cero assets externos») y complican el modo offline/PWA.

---

## ADR 002 · Simulación Desacoplada y Fórmulas Numéricas Cerradas
- **Fecha:** Fase 1 (Cierre)
- **Estado:** Aprobado
- **Decisión:**
  - La economía y la lógica de simulación residen en `src/core/` sin referencias a DOM ni a PixiJS.
  - El coste geométrico en lote de $N$ generadores se computa mediante la suma analítica cerrada de la progresión geométrica: $S = B \cdot r^{\text{owned}} \cdot \frac{r^N - 1}{r - 1}$, permitiendo compras instantáneas de hasta $10^{300}$ unidades en $O(1)$.
  - El cálculo offline es de tiempo cerrado ($O(1)$) multiplicando el tiempo transcurrido (topado en 8 h / 24 h con mejora) por la producción por segundo y la eficiencia, sin bucles de simulación acumulativos.
- **Motivo:** Garantizar determinismo, rendimiento absoluto sin bloqueos en el hilo principal y testeabilidad 100% aislada.

---

## ADR 003 · Escena Gráfica de 5 Capas en PixiJS v8 y Shaders GLSL
- **Fecha:** Fase 2 (Cierre)
- **Estado:** Aprobado
- **Decisión:**
  - Implementar el cielo (`SkyLayer`) y el núcleo «Chispa» (`SparkCore`) como `Mesh` de PixiJS v8 con shaders GLSL 300 ES propios (ruido fractal FBM de 4 octavas para nebulosas y función de corona + rayos rotatorios + anillo de Resonancia para el núcleo).
  - Dividir las órbitas 3D (`OrbitsLayer`) en dos contenedores (`backContainer` para $\sin\theta < 0$ y `frontContainer` para $\sin\theta \ge 0$) alrededor del núcleo, dibujando los 16 arquetipos orbitales en dos instancias `Graphics` reutilizadas cada fotograma.
  - Implementar un filtro unificado de post-proceso (`PostProcessController`) que combina Bloom suave, Lente Gravitacional relativista alrededor de la posición en pantalla del agujero negro, Aberración Cromática en hitos y Viñeta.
- **Motivo:** Mantener menos de 15 draw calls por fotograma y 0 asignaciones de memoria en el bucle caliente.

---

## ADR 004 · Síntesis WebAudio Pentatónica y Guardado con Checksum FNV-1a
- **Fecha:** Fases 7 y 8 (Cierre)
- **Estado:** Aprobado
- **Decisión:**
  - El motor `AudioEngine.ts` sintetiza todos los efectos en tiempo real usando la escala pentatónica mayor acoplada al combo de Resonancia y genera acordes ambientales cuyos fundamentales evolucionan según la era activa, protegidos por un `DynamicsCompressorNode` y un límite estricto de 16 voces simultáneas.
  - El `SaveManager.ts` mantiene doble ranura en `localStorage` (`primary` y `backup` rotativo) y exporta cadenas con cabecera `CHISPA2:<checksum-fnv1a>:<base64>` para impedir corrupción o importaciones truncadas.

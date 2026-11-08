# Informe de Balance y Modelo Económico · CHISPA ∞

Este documento detalla las fórmulas matemáticas, curvas de progresión y resultados del simulador automático (`scripts/simulate.ts`) que gobiernan las 5 capas de **CHISPA ∞**.

---

## 1. Fórmulas Fundamentales (Capa 0 · Energía)

### 1.1 Coste Geométrico y Compra en Lote ($O(1)$)
Cada generador $i$ tiene un coste base $B_i$ y una razón geométrica $r = 1.15$ (o $1.14$ tras desbloquear *Geometría Hiperbólica* en el árbol de Materia Oscura).
- **Coste de la unidad $k$ (poseyendo $n$):**
  $$C(n, 1) = B_i \cdot r^n$$
- **Coste exacto de comprar $k$ unidades simultáneas:**
  $$C(n, k) = B_i \cdot r^n \cdot \frac{r^k - 1}{r - 1}$$
- **Cantidad máxima comprable con energía disponible $E$:**
  $$k_{\max} = \left\lfloor \frac{\ln\left(\frac{E \cdot (r - 1)}{B_i \cdot r^n} + 1\right)}{\ln(r)} \right\rfloor$$

### 1.2 Producción por Segundo (SPS) e Hitos $\times 2$
Cada generador duplica su producción al alcanzar cualquiera de los 10 umbrales de hitos:
$$\text{Hitos} = \{10, 25, 50, 100, 150, 200, 250, 300, 400, 500\}$$
$$\text{SPS}_i = n_i \cdot P_i \cdot 2^{m_i} \cdot M_{\text{mejoras}, i} \cdot M_{\text{global}}$$

### 1.3 Clic y Combo de Resonancia
- Cada clic rápido dentro de la ventana de gracia ($0.7\text{ s}$ base, $1.5\text{ s}$ mejorado) incrementa el combo hasta $30$ ($50$ con *Resonancia Ampliada*).
- El multiplicador de Resonancia escala linealmente desde $\times 1.0$ hasta $\times 3.0$ ($\times 5.0$ mejorado):
  $$V_{\text{clic}} = \left(C_{\text{base}} \cdot 2^{u_{\text{clic}}} + \text{SPS}_{\text{total}} \cdot \sum \text{Eco}\%\right) \cdot M_{\text{resonancia}} \cdot M_{\text{cometa}}$$

---

## 2. Tabla de los 16 Generadores

| # | Generador | Coste Base | Prod. Base /s | Categoría |
|---|---|---|---|---|
| 1 | Átomo | 12 | 0,2 | Partícula |
| 2 | Nube de gas | 90 | 1,5 | Partícula |
| 3 | Protoestrella | 800 | 9 | Estelar |
| 4 | Estrella enana | 9 K | 55 | Estelar |
| 5 | Púlsar | 100 K | 320 | Estelar |
| 6 | Nebulosa | 1,2 M | 1,9 K | Estelar |
| 7 | Agujero negro | 15 M | 11 K | Cósmico |
| 8 | Galaxia | 200 M | 65 K | Cósmico |
| 9 | Cúmulo galáctico | 3 B | 400 K | Cósmico |
| 10 | Universo | 50 B | 2,5 M | Cósmico |
| 11 | Cuásar | 7,5 T | 16 M | Trascendente |
| 12 | Brana | 120 T | 100 M | Trascendente |
| 13 | Cuerda cósmica | 2 Qa | 650 M | Trascendente |
| 14 | Burbuja de multiverso | 35 Qa | 4 B | Trascendente |
| 15 | Mente cósmica | 600 Qa | 27 B | Trascendente |
| 16 | Chispa original | 10 Qi | 200 B | Trascendente |

---

## 3. Capas de Prestigio (Capas 1 a 5)

1. **Capa 1 · Big Bang (Materia Oscura):**
   $$\text{Materia Oscura} = \left\lfloor \sqrt{\frac{E_{\text{ejecución}}}{10^7}} \right\rfloor$$
   Cada punto otorga $+10\%$ permanente de producción y sirve para desbloquear los 23 nodos del árbol de Materia Oscura.
2. **Capa 2 · Multiverso (Fragmentos de Realidad):**
   Se abre tras $10$ Big Bangs o $10^{15}$ de energía total. Permite asignar atención a 5 Universos Paralelos con reglas físicas modificadas y superar 4 Retos Cósmicos.
3. **Capa 3 · Conciencia (Atención y Mapa de Constelaciones):**
   Permite trazar 40 constelaciones permanentes que iluminan el cielo y despierta al **Observador**.
4. **Capa 4 · Eternidad (Eones y Reloj Cósmico):**
   Tras completar $\ge 25$ constelaciones, el jugador controla el Reloj Cósmico (aceleración $\times 2$, rebobinado de ejecución y **Nueva Partida+** con multiplicador $\times 3$ acumulativo sin límite duro).

---

## 4. Resultados del Simulador (`npm run simulate`)

- **Primer generador (Átomo):** ~4 s con clic activo (~10 s en ritmo humano casual).
- **5 tipos de generador (hasta Púlsar):** 4 min 53 s (Meta: ~5 min).
- **Primer Big Bang ($10^7$ energía = 1 DM):** ~5 min 30 s en bot óptimo (~20–30 min en ritmo humano).
- **Segundo Big Bang:** ~41–60% del tiempo del primero gracias al árbol de Materia Oscura.
- **10 tipos de generador y Multiverso:** Alcanzados en el décimo ciclo de prestigio.

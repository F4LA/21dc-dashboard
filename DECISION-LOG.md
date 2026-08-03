# DECISION LOG — 21DC Dashboard

Registro cronológico de decisiones y cambios al dashboard (frontend `index.html` y backend `.gs`).
**Entrada más reciente arriba.** Cada entrada: fecha · qué se cambió · por qué.

> Este log es para cambios **en curso** del dashboard. Las decisiones estratégicas/operativas previas de los Proyectos A/B/C (pre-dashboard) viven en [`context/21DC_Master_Decision_Log_v2.md`](context/21DC_Master_Decision_Log_v2.md), que es un documento distinto y se deja como referencia histórica.
>
> **Obligatorio:** todo cambio al dashboard agrega una entrada aquí (ver la regla en `CLAUDE.md`).

---

## 2026-08-03 — Fase 2: Cancel Recovery en el prompt de AI Analysis (backend)

**Qué se cambió (backend `Code.gs`):**
- `summarizeChallenge_` ahora computa `cancelledEver / recovered / optedOut / noResponse / stillInCadence` (excluye refunded+inactive, igual que el funnel del frontend). Estos campos viajan solos al prompt vía `JSON.stringify(target)`.
- `buildAnalysisPrompt_`: dos bullets de contexto nuevos (qué significan las categorías de cancel-recovery; y que el CC nunca lleva opt-out) + el tema 1 (funnel) ahora pide narrar el breakdown de recuperación.

**Setup / deploy:** pegar ambas funciones en `Code.gs` (editor de Apps Script) → **Manage deployments → Edit → New version**. Se verá solo cuando la AI Analysis tenga créditos de Anthropic (TODO #1). Copia de trabajo `~/Downloads/Code_21DC_Dashboard.gs` sincronizada.

**Por qué:** cierra el pedido de que el análisis con AI cuente la historia del cancel-recovery ("de X que cancelaron: A reagendaron, B opt-out, C no respondieron"), no solo las conversiones. El backend no está en git → se documenta aquí y en `DASHBOARD-SYSTEM.md` (§5.4, §14 items 16–17).

**Archivos / commits:** Code.gs (fuera de git) · DASHBOARD-SYSTEM.md + DECISION-LOG.md · a240567

---

## 2026-08-03 — Opt-Out + No Response para cancelaciones que no valen reschedule

**Qué se cambió (frontend `index.html`):**
- Nueva disposición **Opt-Out** para el **Discovery Call**: botón en el modal (solo en `DC - Cancelled` / `DC - No Show`) que marca la columna **`Opted Out`** y **exige una nota de razón** (se guarda en GHL como `[Opt-Out] <razón>`). Saca al lead de la reschedule cadence (Action Queue) y de Accountability. Oculta el botón de Reschedule.
- Nueva disposición **No Response** (derivada, sin botón ni columna nueva): se calcula como *`Reschedule Offer Doc` marcado + sigue en un stage de cancel/no-show*. Se auto-corrige: si el lead reagenda, el stage sube a `*-Scheduled` y el tag desaparece solo. Opt-Out tiene precedencia.
- **Tracker:** badges "Opted Out" (morado) y "No Response" (ámbar) + dos chips nuevos. Ambas disposiciones se excluyen de los chips "CC Issues"/"DC Issues" (dejan de ser worklist pendiente).
- **Analytics:** nueva card **"Cancel Recovery"** — de los que cancelaron/no-show: recuperados (reagendaron) / opted out / no response / aún en cadencia. **Se quedan DENTRO del funnel** (a diferencia de Refunded/Inactive): bookearon pero no convirtieron, es un resultado real.
- Helper `recomputeDisposition(p)` (fuente única de `isOptedOut` / `isNoResponse`), usado por `enrich`, `markOptedOut`, `clearOptedOut`.

**Requisito de setup (Bernardo, una vez):** agregar manualmente la columna **`Opted Out`** en los tabs **`Participants` y `Historical`** del Participant Tracking Sheet. `recordEvent_` lanza error si la columna no existe. Agregar columnas no requiere redeploy del backend.

**Pendiente (Fase 2, diferida):** alimentar el breakdown de Cancel Recovery al prompt de la AI Analysis (`summarizeChallenge_` / `buildAnalysisPrompt_` en el backend). Diferido porque toca los `.gs` (no están en git, riesgo de clobber) y porque la AI Analysis está rota por créditos de Anthropic (TODO #1) — el breakdown ya es visible en la card de Analytics sin la AI.

**Por qué:**
- El dashboard trataba todo `Cancelled/No Show` como "persíguelo para reagendar". Cuando alguien cancela porque se auto-descalificó (no es fit / budget), perseguirlo desperdicia esfuerzo del closer y contamina los flags de Accountability con leads incerrables. Opt-Out cierra ese caso; No Response hace visible (y permite cerrar) el ghost tras la cadencia completa.
- CC no lleva Opt-Out: es pre-oferta, una cancelación siempre vale reagendar (decisión de Bernardo). Solo el DC tiene la compuerta de calificación (videos pre-DC) que produce auto-descalificaciones.

**Archivos / commits:** index.html · 73fcb26

---

## 2026-08-03 — Se establece el sistema de documentación viva

**Qué se cambió:**
- Se renombró `HANDOFF-21DC-Dashboard.md` → `DASHBOARD-SYSTEM.md` y se convirtió de traspaso puntual a **documento vivo / fuente de verdad permanente**, con línea de "Última actualización".
- Se creó este `DECISION-LOG.md`.
- Se agregó a `CLAUDE.md` la **regla de documentación obligatoria**: cada cambio al dashboard debe hacer `git pull` → aplicar el cambio → actualizar `DASHBOARD-SYSTEM.md` (y su fecha) → agregar entrada aquí → `git push`.

**Por qué:**
- El handoff era un snapshot que envejece. Se necesita una fuente de verdad que se mantenga sola actualizada, atada a un flujo obligatorio, para que ninguna modificación quede sin documentar y las sesiones nuevas siempre encuentren el estado real del sistema.

---

<!-- Plantilla para nuevas entradas (copiar arriba de esta línea):

## YYYY-MM-DD — Título corto del cambio

**Qué se cambió:**
- ...

**Por qué:**
- ...

**Archivos / commits:** index.html / Code.gs / ... · <hash>

-->

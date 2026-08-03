# DECISION LOG — 21DC Dashboard

Registro cronológico de decisiones y cambios al dashboard (frontend `index.html` y backend `.gs`).
**Entrada más reciente arriba.** Cada entrada: fecha · qué se cambió · por qué.

> Este log es para cambios **en curso** del dashboard. Las decisiones estratégicas/operativas previas de los Proyectos A/B/C (pre-dashboard) viven en [`context/21DC_Master_Decision_Log_v2.md`](context/21DC_Master_Decision_Log_v2.md), que es un documento distinto y se deja como referencia histórica.
>
> **Obligatorio:** todo cambio al dashboard agrega una entrada aquí (ver la regla en `CLAUDE.md`).

---

## 2026-08-03 — Scheduled Calls: fase FU + regla de outcome del FU

**Qué se cambió (frontend `index.html` + backend `Code.gs`):**
- **Backend:** nueva `getFuCallTimesByEmail_` (calendario FU, cache `fuCallTimesByEmail:v1`, calentada dentro de `warmLastDcCache`). `getOpportunities` expone `fuCallAt`/`fuCallEndAt`/`fuCallAssignedUserName`.
- **Frontend:** `CALL_TYPES` ahora incluye **FU**; `renderCallTimeSection` recorre `CALL_TYPES` (auto-incluye FU) y `getAllScheduledCalls` mezcla CC+DC+FU. Las secciones de Accountability y el modal ya muestran FU.

**Regla del FU (decisión de Bernardo, sin código nuevo):** un FU con **no-show o cancel** se marca como **`Didn't Purchase`** (no se crean stages FU No Show/Cancelled ni cadencia de chase). El prompt post-llamada ("marcar compró / no compró") ya existía en **Today → Calls Today** (badge "Needs update" → "Processed" al marcar el outcome; para FU aplica `hasStageAdvancedAfter`). **Caveat documentado:** `Didn't Purchase` es terminal duro; si reagendan luego, no reaparecen solos (raro, manual).

**Por qué:** el FU es la llamada de cierre; a esas alturas un no-show/cancel ≈ no compra, así que no vale una cadencia. Lo que faltaba era visibilidad (coming up / not updated) para FU y asegurar que el outcome se registre.

**Setup / deploy:** pegar `Code.gs` completo → New version. No requiere trigger nuevo. Copia `~/Downloads` sincronizada.

**Archivos / commits:** index.html · Code.gs (fuera de git) · <hash>

---

## 2026-08-03 — Se quita el "Day 19 Offer Doc" del plato de Gabi

**Qué se cambió (frontend `index.html`):**
- `getCCBookingFlow`: eliminado el paso **Day 19 Offer Doc** (y el `day19EligibleStages`). El flujo de CC Booking Outreach queda Day 2 DM → Day 4 Call.
- `getJackieFlags`: quitado el step `Day 6 Offer Doc Sent` de la cadencia; el `Day 4 Call #1` ahora tiene `next: null`. Ya no genera flag de Accountability por Offer Doc.
- Se conserva: la columna `Day 6 Offer Doc Sent`, su copy message y el override manual pasivo en el modal (More options). El **Reschedule Offer Doc de Deniz** queda intacto.

**Por qué:** si el participante nunca agendó/atendió el CC, la probabilidad de que agende un DC es mínima, así que el offer doc de Gabi ahí no aporta. Los offer docs los maneja Deniz dentro de la reschedule cadence / conversación. Decisión de Bernardo.

**Archivos / commits:** index.html · 30fc741

---

## 2026-08-03 — Scheduled Calls: fase CC (completa CC + DC)

**Qué se cambió (frontend `index.html` + backend `Code.gs`):**
- **Backend:** nueva `getCcCallTimesByEmail_` — lee los **dos** calendarios de CC (público + admin override), dedup por event id, mapea email → `{callAt, callEndAt, assignedUser}` (ventana 90d atrás + 30d adelante), cache `ccCallTimesByEmail:v1`. Se calienta **dentro de `warmLastDcCache`** (no requiere trigger nuevo). `getOpportunities` expone `ccCallAt`/`ccCallEndAt`/`ccCallAssignedUserName` (solo full).
- **Frontend:** generalizado a CC+DC con una config `CALL_TYPES`. `renderCallTimeSection` muestra la hora del CC o DC según el stage. Accountability: las secciones ahora son **"Calls — coming up"** y **"Calls — happened, not updated"** (CC+DC mezcladas, ordenadas por hora, cada card etiqueta CC/DC). Helpers `getScheduledCalls(type)`, `getAllScheduledCalls`.

**Por qué:** completa el pedido original (CC + DC). Se hizo por fases: DC primero (casi gratis, reusaba el fetch de DC), CC después (agrega un fetch cacheado/warmed de los dos calendarios de CC).

**Setup / deploy:** pegar `Code.gs` completo → **Manage deployments → Edit → New version**. No requiere trigger nuevo (el warmer de 10 min ya calienta CC). Copia `~/Downloads/Code_21DC_Dashboard.gs` sincronizada.

**Archivos / commits:** index.html · Code.gs (fuera de git) · bf94ba9

---

## 2026-08-03 — Scheduled Calls: hora real del DC + "not updated" (fase DC)

**Qué se cambió (frontend `index.html` + backend `Code.gs`):**
- **Backend:** `getLastDcAssignedByEmail_` ahora guarda `callAt`/`callEndAt` (hora real del DC de GHL Calendar) además de la atribución del closer; cache key bump `:v1`→`:v2`. `getOpportunities` expone `dcCallAt`/`dcCallEndAt` (solo en la llamada full). Reusa el fetch ya cacheado + warmed, así que no agrega costo al request.
- **Frontend — modal:** `renderCallTimeSection` muestra "Discovery Call: <hora ET>" en `DC - Scheduled`; si terminó hace 1h+ y sigue en Scheduled, ámbar con ⚠.
- **Frontend — Accountability:** dos secciones nuevas: **"Discovery Calls — coming up"** (upcoming, ordenado por más próxima = cuántas llamadas quedan) y **"Discovery Calls — happened, not updated"** (call terminó hace 1h+, ventana 7 días, sigue en Scheduled). Helpers `getScheduledDcCalls`, `renderCallCard`, `fmtCallTimeET`, `relTime`. Todo en Eastern sin importar el TZ del navegador.

**Por qué:** Bernardo quería ver cuántas llamadas quedan y cachar las que aparecen agendadas pero ya sucedieron sin actualizarse. Accountability antes NO veía eso: solo vigilaba la reschedule cadence (que requiere un cancel/no-show ya marcado), nunca un DC agendado que el closer simplemente no tocó. La hora real no está en el sheet (solo en GHL Calendar) — §15.

**Setup / deploy:** pegar en `Code.gs` los 2 cambios (2 líneas en `getOpportunities` + función `getLastDcAssignedByEmail_` completa) → **Manage deployments → Edit → New version**. Copia `~/Downloads/Code_21DC_Dashboard.gs` sincronizada. **Fase CC pendiente** (§14 item 18).

**Archivos / commits:** index.html · Code.gs (fuera de git) · cea5008

---

## 2026-08-03 — Autor obligatorio en las notas ("Note by")

**Qué se cambió (frontend `index.html`):**
- La sección "Add note" del modal ahora tiene un selector **"Note by"** (Gabi/Bernardo/Deniz/Joey/Anthony) **obligatorio**: `saveNote` no guarda sin autor y antepone `[autor]` al cuerpo de la nota en GHL.
- La elección se recuerda en `localStorage` (`note-author`) por dispositivo, así cada quien se elige una vez. Helpers: `NOTE_AUTHORS`, `populateNoteAuthor`, `rememberNoteAuthor`, `requireNoteAuthor`.
- La nota de **Opt-Out** también exige y estampa el autor → `[Opt-Out · <autor>] <razón>`.

**Por qué:** el dashboard escribe todas las notas con el mismo PIT token, así que en GHL todas aparecen del mismo usuario y no se puede saber quién del equipo la dejó. Capturar el autor en el dashboard resuelve la auditabilidad sin cambiar el backend.

**Archivos / commits:** index.html · ceae018

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

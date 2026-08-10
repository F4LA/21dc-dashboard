# DECISION LOG — 21DC Dashboard

Registro cronológico de decisiones y cambios al dashboard (frontend `index.html` y backend `.gs`).
**Entrada más reciente arriba.** Cada entrada: fecha · qué se cambió · por qué.

> Este log es para cambios **en curso** del dashboard. Las decisiones estratégicas/operativas previas de los Proyectos A/B/C (pre-dashboard) viven en [`context/21DC_Master_Decision_Log_v2.md`](context/21DC_Master_Decision_Log_v2.md), que es un documento distinto y se deja como referencia histórica.
>
> **Obligatorio:** todo cambio al dashboard agrega una entrada aquí (ver la regla en `CLAUDE.md`).

---

## 2026-08-10 — History respeta refunds/inactivos (consistencia con Analytics en vivo)

**Qué se cambió (backend `GHL.gs`, `computeChallengeSummary_`):**
- Ahora **espeja `computeFunnel`**: excluye `Refunded` e `Marked Inactive` del funnel + purchases + revenue; netea la cuota de `Courtesy Refund`. Antes contaba TODA compra sin mirar flags → los challenges archivados sobre-contaban purchases y revenue.
- Nuevos campos en el summary: `refunded`, `refundRev`, `courtesyRefund`, `courtesyRev`, `inactive`. `totalRev` ahora netea refunds+courtesy.

**Por qué:** el tab History mostraba 5 purchases en julio, pero 2 no eran reales: **Peter Berg** (Refunded) y **Anisya Fritz** (Marked Inactive). El Analytics en vivo ya los excluía, pero History no → inconsistencia. Con el fix, julio = **3** (Allie, Susan, Libbey-courtesy).

**Regla de datos (documentada):** para quien **nunca participó** (compró y se le hizo refund antes de empezar, sin pasar por el funnel del challenge — ej. **Peter Berg**, que se fue directo a 1-on-1 por su cuenta) → **borrar la fila** del `Historical` a mano (Bernardo), porque si solo se marca `Refunded` seguiría contando en "Enrolled". Para refunds/inactivos de gente que **sí participó** → usar los flags (los maneja este fix). Su venta 1-on-1 no se pierde: vive en Stripe/GHL/Mastersheet. Backup: tab `Pre-Archive`.

**Setup / deploy:** pegar `GHL.gs` completo → **Manage deployments → Edit → New version**. Bernardo además borra la fila de Peter en `Historical`.

**Archivos / commits:** GHL.gs (fuera de git) · DASHBOARD-SYSTEM.md + DECISION-LOG.md · 1ea169d

---

## 2026-08-10 — Nuevo tab "Calls" (agenda) separado de Accountability

**Qué se cambió (frontend `index.html`):**
- Nuevo tab **Calls** (entre Today y Accountability) con `renderCalls()`. Contiene **solo "coming up"**, en secciones **colapsables por tipo** (`obSection`): **Clarity Calls**, **Discovery Calls**, y **Follow-Up Calls** (solo si hay ≥1). Contador en el tab (`calls-count`) = total próximas.
- **Accountability se limpió:** se le quitó la sección "Calls — coming up"; queda solo "Calls — happened, not updated" + Dennis + Gabi (accountability real). El badge del tab (`getAccountabilityCount`) no incluye próximas llamadas (nunca lo hizo).
- `setView` rutea `'calls'`; nuevo contenedor `#calls-wrap`.

**Por qué:** las "coming up" son una **agenda** (qué llamadas vienen), no accountability ("¿el equipo hizo su trabajo?"). Mezcladas mostraban "33" como si fueran pendientes/notificaciones. Bernardo pidió separarlas en su propio tab con categorías colapsables.

**Archivos / commits:** index.html · fba0002

---

## 2026-08-10 — Fix: bookings del dashboard no registraban CC/DC Scheduled + título "(Rescheduled)"

**Qué se cambió (backend `Code.gs`, handler `bookAppointment`):**
- **Ahora escribe la columna Scheduled al sheet para TODOS los tipos** (`CC Scheduled` / `DC Scheduled` / `FU Scheduled`), no solo FU. Antes CC/DC no se escribían y dependían de una automatización de GHL que **no dispara confiablemente en citas creadas por API** → DC que Deniz sí agendaba salían en el dashboard como si siguieran en CC-Scheduled (inconsistente: a unos sí, a otros no).
- **Título de cita corregido:** antes toda cita CC/DC se titulaba `"(Rescheduled)"` aunque fuera fresca. Ahora "Clarity Call / Discovery Call / Follow-Up Call — Nombre".

**Por qué:** Bernardo reportó que los DC salían como "DC (Rescheduled)" en GHL y que varios agendados no aparecían en el dashboard. Se verificó en el CSV: Chad/Sergio/Liz tenían el DC en GHL pero `DC Scheduled` vacío. La cita se crea normal (`appointmentStatus: confirmed`); el problema era la dependencia de la automatización + el título hardcodeado.

**Nota:** `computeStage_` ya maneja reschedules por el desempate cronológico (un `*Scheduled` nuevo tras un Cancelled/No Show revive el stage), así que escribir la columna en reschedules también es correcto. La automatización de GHL del DC queda redundante para bookings del dashboard (los CC self-book del público siguen dependiendo de su automatización).

**Data ya afectada (pre-fix):** los DC ya agendados que no aparecen (Chad, Sergio, Liz) se arreglan a mano con **modal → More options → Manual Booking Override → "Mark DC Scheduled"** (registra el booking existente sin crear cita nueva en GHL).

**Setup / deploy:** pegar `Code.gs` completo → **Manage deployments → Edit → New version**. Copia `~/Downloads` sincronizada.

**Archivos / commits:** Code.gs (fuera de git) · DASHBOARD-SYSTEM.md + DECISION-LOG.md · f1ba779

---

## 2026-08-03 — Settings: renombrar "Challenge Start Date" → "Accepting-clients start date"

**Qué se cambió (frontend `index.html`, solo texto):**
- Label del setting **"Challenge Start Date" → "Accepting-clients start date"** + hint explicando que es el día que abre el promo (viernes), **no** el primer día del challenge, y que el **Día 1 = esta fecha + 10 días** (`getDay1Date`). El Script Property sigue siendo `CHALLENGE_START_DATE` (no se tocó el backend).
- Actualizado el empty-state de CC Booking Outreach ("Set the accepting-clients start date…").
- Corregida la descripción de CC Booking Outreach: quitado "→ Day 19 Offer Doc (Gabi)" que quedó colgado tras removerlo (ahora "Day 2 DM → Day 4 Call").

**Por qué:** Bernardo se confundió y puso el primer día del challenge (3-ago) como start date → dashboard vacío (excluye a los que compraron en la promo) y Día 1 mal. La fecha correcta es la de apertura de promo (24-jul); el nombre viejo inducía al error. **No** se cambió la mecánica (sigue el `+10` hardcodeado); se evaluó rediseñar para que sea "el primer día del challenge" directo, pero se dejó para hacerlo entre challenges (toca el filtro de participantes, riesgoso en vivo).

**Archivos / commits:** index.html · e1f0426

---

## 2026-08-03 — GHL.gs: errores en inglés + match de columna tolerante a espacios

**Qué se cambió (backend `GHL.gs`):**
- Todos los mensajes de `throw new Error(...)` que eran en español → **inglés** (`recordEvent_`, `recordHistoricalEvent_`, `archiveChallenge_`, `ghlRequest_`/`ghlRequestVersioned_`). Cumple la regla "UI 100% en inglés" (el error llegaba al `alert` del frontend).
- Nueva helper `findHeaderIndex_(headers, columnName)` que compara con `.trim()` en ambos lados; `recordEvent_` y `recordHistoricalEvent_` la usan. Un header escrito a mano con espacio de más (ej. `"Courtesy Refund "`) ya no rompe el match.

**Por qué:** al agregar la columna `Courtesy Refund` a mano quedó con un espacio al final → `recordEvent_` tiraba "Columna no encontrada" (en español). Se corrige el idioma y se blinda contra espacios accidentales en headers.

**Nota importante:** la copia `~/Downloads/GHL.gs` estaba **desactualizada** (de junio, mensajes en inglés) vs el deployado (español). Bernardo pasó el `GHL.gs` actual del editor; se corrigió sobre esa versión y se re-sincronizó `~/Downloads/GHL.gs`.

**Setup / deploy:** pegar `GHL.gs` completo → **Manage deployments → Edit → New version**. `GHL.gs` no está en git.

**Archivos / commits:** GHL.gs (fuera de git) · DECISION-LOG.md · fc3b60b

---

## 2026-08-03 — Courtesy refund (refund que no excluye del funnel/Purchases)

**Qué se cambió (frontend `index.html` + columna nueva):**
- Nueva disposición **Courtesy refund** (columna `Courtesy Refund`, a agregar a mano en `Participants` + `Historical`). Es un refund de la **cuota del challenge** (típicamente por un error nuestro) donde la persona **siguió activa y puede comprar**.
- Comportamiento: **netea la cuota del challenge** del revenue, pero la mantiene contada en todo lo demás (funnel, Net participants, **Purchases**, su venta 1-on-1). A diferencia del `Refunded` duro, que excluye de todo.
- `enrich`: `p.isCourtesyRefund`; y `p.isRefunded = Refunded && !CourtesyRefund` (courtesy gana si por error quedan ambos). `computeFunnel`: no hace early-return para courtesy, suma `courtesyRefundCount/Revenue` y los resta del challenge-net. Analytics: línea "Courtesy refunds". Badge azul en Tracker (sin atenuar). Modal: botón "Mark courtesy refund" / Undo (`markCourtesyRefund` limpia el `Refunded` duro al convertir).

**Por qué:** el `Refunded` era demasiado bruto — borraba también la venta 1-on-1 real de alguien que solo recibió un refund de cortesía del challenge (caso Libby: compró 1-on-1 pero no salía en Purchases). Los refunds "se fue" (la mayoría) se quedan como `Refunded` = excluir; courtesy es la excepción.

**Setup:** agregar la columna `Courtesy Refund` en `Participants` + `Historical`. **Sin deploy de backend** (solo frontend + columna). Pendiente menor: reflejar courtesy en `summarizeChallenge_` del AI (diferido, la AI está rota por créditos).

**Archivos / commits:** index.html · 9a92a03

---

## 2026-08-03 — Scheduled Calls: fase FU + regla de outcome del FU

**Qué se cambió (frontend `index.html` + backend `Code.gs`):**
- **Backend:** nueva `getFuCallTimesByEmail_` (calendario FU, cache `fuCallTimesByEmail:v1`, calentada dentro de `warmLastDcCache`). `getOpportunities` expone `fuCallAt`/`fuCallEndAt`/`fuCallAssignedUserName`.
- **Frontend:** `CALL_TYPES` ahora incluye **FU**; `renderCallTimeSection` recorre `CALL_TYPES` (auto-incluye FU) y `getAllScheduledCalls` mezcla CC+DC+FU. Las secciones de Accountability y el modal ya muestran FU.

**Regla del FU (decisión de Bernardo, sin código nuevo):** un FU con **no-show o cancel** se marca como **`Didn't Purchase`** (no se crean stages FU No Show/Cancelled ni cadencia de chase). El prompt post-llamada ("marcar compró / no compró") ya existía en **Today → Calls Today** (badge "Needs update" → "Processed" al marcar el outcome; para FU aplica `hasStageAdvancedAfter`). **Caveat documentado:** `Didn't Purchase` es terminal duro; si reagendan luego, no reaparecen solos (raro, manual).

**Por qué:** el FU es la llamada de cierre; a esas alturas un no-show/cancel ≈ no compra, así que no vale una cadencia. Lo que faltaba era visibilidad (coming up / not updated) para FU y asegurar que el outcome se registre.

**Setup / deploy:** pegar `Code.gs` completo → New version. No requiere trigger nuevo. Copia `~/Downloads` sincronizada.

**Archivos / commits:** index.html · Code.gs (fuera de git) · b97a31e

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

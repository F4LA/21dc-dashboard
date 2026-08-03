# HANDOFF — 21DC Dashboard (Strong Standard Coaching)

**Documento de traspaso exhaustivo · Uso interno**
Cubre la construcción y estado del dashboard entre el **9 de junio y el 14 de julio de 2026** (sesión "21DC Dashboard", ~30 MB de conversación), más el contexto anterior de los Proyectos A/B/C/D.

> **Para qué sirve este documento.** Está diseñado para que una sesión nueva de Claude Code (o cualquier persona técnica) pueda entender el dashboard al 100% y hacer modificaciones sin romper nada ni perder contexto. Prioriza completitud sobre brevedad. Si algo aquí contradice el código, **el código gana** — este doc refleja el estado al 14-jul-2026.

---

## 0. Cómo arrancar una sesión nueva (léelo primero)

1. Apunta al folder `/Users/bernardolopez/Desktop/21dc-dashboard`.
2. Primer mensaje sugerido:
   > "Lee `CLAUDE.md`, `MEMORY.md` y `/context`. Después dime en 5 líneas qué entendiste del estado actual. No leas código todavía."
3. Luego lee **este** archivo completo.
4. **Gotcha #1 crítico:** el backend real **NO está en git**. La carpeta `apps-script/` del repo es una versión **temprana y desactualizada** (de mayo, un solo pipeline, sheet de 5 columnas). El backend en producción vive en:
   - El editor de Google Apps Script (proyecto del dashboard), y
   - Copias de trabajo en `~/Downloads/*.gs` (`Code_21DC_Dashboard.gs`, `GHL.gs`, `Config.gs`, `Intake.gs`, `Macro_Engine.gs`).
   `git log` **solo** refleja cambios de `index.html`.

---

## 1. Qué es el 21DC Dashboard

Herramienta interna de operaciones para el **21-Day Challenge** de Strong Standard Coaching. Reemplaza el "Mastersheet" operativo que se abandonó por requerir mantenimiento manual. Es la **interfaz principal del equipo durante cada challenge**: en vez de abrir GoHighLevel (GHL), el equipo trabaja desde el dashboard.

- **Frontend:** un solo archivo `index.html` (~6.200 líneas HTML+CSS+JS vanilla, sin frameworks). Hospedado en **GitHub Pages**: `https://f4la.github.io/21dc-dashboard/`. Repo: `https://github.com/F4LA/21dc-dashboard`. Auto-deploy ~1 min tras cada push a `main`.
- **Backend:** **Google Apps Script** publicado como Web App (actúa de proxy para no exponer las API keys). El frontend lo llama como un API REST (`SCRIPT_URL/exec?action=...` para GET, POST con JSON body).
- **"Base de datos" operativa:** un **Google Sheet** ("21DC — Participant Tracking") con tabs `Participants`, `Historical`, `Challenge Costs`, más backups. El stage de cada participante **se computa** desde qué columnas de timestamp están llenas (no se almacena un stage).
- **Fuentes secundarias:** GHL (contactos, notas, calendarios, custom fields), el **Mastersheet** (montos de compra, refunds, coach payouts), el **Macro Engine** (intake form + macros), y **Everfit** (login/onboarding, vía columnas que otras automatizaciones llenan).

### El journey que modela

`Compra (Participant) → CC agendada (Clarity Call) → CC atendida → DC agendada (Discovery Call) → DC atendida → Compra 1-on-1 / Group Coaching`, con ramas de cancelación/no-show, follow-up, "no agendó DC" y refunds.

---

## 2. Arquitectura y flujo de datos

```
┌────────────────────────┐        ┌──────────────────────────────┐
│  index.html (frontend) │  HTTP  │  Apps Script Web App (proxy) │
│  GitHub Pages          │ ─────► │  Code.gs / GHL.gs / Config.gs │
│  vanilla JS            │ ◄───── │  Intake.gs                    │
└────────────────────────┘  JSON  └──────────────┬───────────────┘
                                                  │ lee/escribe
      ┌───────────────────────────────────────────┼───────────────────────────────┐
      ▼                     ▼                      ▼                ▼               ▼
┌───────────┐      ┌──────────────┐      ┌────────────────┐  ┌───────────┐  ┌───────────┐
│ Participant│      │ GHL API v2   │      │ Mastersheet     │  │ Macro     │  │ Anthropic │
│ Tracking   │      │ contacts,    │      │ (montos,        │  │ Engine    │  │ API       │
│ Sheet      │      │ notes,       │      │ refunds,        │  │ (intake + │  │ (AI       │
│ (Sheets)   │      │ calendars,   │      │ coach payouts)  │  │ macros)   │  │ Analysis) │
│            │      │ users        │      │ (Sheets)        │  │ (Sheets)  │  │           │
└───────────┘      └──────────────┘      └────────────────┘  └───────────┘  └───────────┘
```

- **El dashboard NO usa el pipeline de GHL en runtime.** Existe un `GHL_PIPELINE_ID` en Script Properties, pero el stage se computa del sheet. El pipeline solo se tocó una vez para un backfill histórico.
- **Escrituras:**
  - Botones de stage/onboarding/outreach → **Google Sheet Participants** (vía `recordEvent`/`clearEvent`).
  - "Add note" en el modal → **GHL** (nota en el contacto, para auditabilidad).
  - Booking de citas (Reschedule / Book DC / Book FU / Book CC) → **GHL Calendar** (crea appointment real); FU además escribe `FU Scheduled` en el sheet.
  - Update Past Challenge → **Google Sheet Historical**.
  - Montos/refunds/coach cost → **se leen del Mastersheet** (enrichment on-read); un writer opcional los copia al sheet sin sobrescribir.

### Deployment — reglas de oro

- **Frontend:** editar `index.html` → `git add` + commit + push a `main`. GitHub Pages redeploya solo (~1 min). Para ver cambios: `Cmd+Shift+R` (bypass cache).
- **Backend:** Bernardo pega el `.gs` completo en el editor de Apps Script y **SIEMPRE** deploya así:
  `Deploy → Manage deployments → Edit (lápiz) → New version → Deploy`.
  **NUNCA "New deployment"** — eso crea una URL nueva y rompe el dashboard.
- **Script Properties** se leen en cada request → cambiarlas **no** requiere redeploy.
- **Agregar columnas al sheet** (helpers de `Config.gs`) **no** requiere redeploy.

---

## 3. Fuentes de datos (IDs reales y no-secretos)

> **Los API keys/tokens NUNCA van aquí ni en el repo.** Viven solo en Script Properties. Ver §11.

| Recurso | ID / URL | Notas |
|---|---|---|
| **Participant Tracking Sheet** | `1QWWYn5_SgwCOPaFtq_7CV-WsVnrtmwjUoXPFm7gVM7A` | Tabs `Participants`, `Historical`, `Challenge Costs`, `Backup YYYY-MM-DD`, `Pre-Archive …` |
| **Mastersheet** | `1ctM6K8hQfh73bi7f-MtXkqW3BaPxU73NZf8xPJQUEOc` | Montos de compra, refunds, coach payouts |
| **Macro Engine Sheet** | `18WvFlZTO18hqKqCKfCUQvz6Nu_CzixIi_dVnHT8iDAA` | Intake form + macros calculados |
| **Apps Script (dashboard)** | proyecto `1QOrz5iyLNhzfDndoQDE7_QV5pMP4I0iqu5oINtqE1BJBncZ7odmuKOkS` | Web App: "Execute as: Me, Anyone can access" |
| **GHL Location ID** | `cZF68TO3vzxTOnAdACdK` | |
| **GHL Pipeline ID** | `YJsIIlDbwjFe2G2o4eSf` | "21 Day Challenge - Sales Team" (no usado en runtime) |
| **Calendar CC (público)** | `bPerFFiHn0EXeBUjxdye` | Self-book, abierto solo semana 2 |
| **Calendar CC Admin Override** | `8jIT8gOKUu2o5Is0QPuG` | Deniz, disponibilidad completa, no público; lo usa el dashboard |
| **Calendar DC** | `O2LN5YI8warRUlvYz5JV` | Round-robin Deniz + Joey |
| **Calendar FU (Follow-Up)** | `XeQKEhVVU6GhwflNE8Oa` | 20 min |
| **userId Deniz (Avci)** | `ukB3nQIO1CeBTVBCpawc` | CC, CC admin, DC, FU |
| **userId Joey** | `dQXRLCHfq7hWoPsxcQH0` | solo DC + FU |
| **Frontend** | `https://f4la.github.io/21dc-dashboard/` | |
| **Mastersheet tab 1-on-1** | "Client Mastersheet" (gid=0) | email col C, monto col E, fecha col F, refund col Y |
| **Mastersheet tab GC** | "Group Coaching - Client Mastersheet" (gid=654393040) | email≈col C, monto≈col E, refund≈col S; payout col L/13, duración col I/8 |

**Everfit:** no hay integración por API. El "Login to Everfit" y otros hitos llegan al sheet vía automatizaciones externas (workflow de GHL de **Miguel** + Zapier). Everfit es el canal por donde Gabi manda los DMs de Welcome / Intake reminders.

---

## 4. El modelo de datos: sheet `Participants` y cómo se computa el stage

### 4.1. Columnas de `Participants`

**Nunca se renombran** (los históricos y las automatizaciones dependen de los nombres). La UI muestra labels distintos a veces (ver "labels legacy" abajo).

- Identidad: `First Name` (A), `Last Name` (B), **`Email` (C, índice 2 — key de matching, siempre lowercased+trim)**, `Date Purchased`, `Source`, `$ Package`.
- Onboarding (Gabi): `Login to Everfit`, `Register Kickoff`, `Login Reachout Sent` (= Reminder #1), `Login Reachout 2 Sent` (= Reminder #2), `Welcome Message Sent`, `Training Assigned`, `Calories Assigned`, `Day 2 DM Sent`, `Day 4 Call #1`, `Day 5 Call #2` (columna viva pero **fuera de UI**), `Day 6 Offer Doc Sent` (UI lo llama "Day 19 Offer Doc"), `Intake Reminder 1 Sent`, `Intake Reminder 2 Sent`.
- Reschedule cadence (Deniz): `Reschedule DM Sent`, `Reschedule Call #1`, `Reschedule Call #2`, `Reschedule Offer Doc`.
- Lifecycle de ventas (timestamps): `CC Scheduled`, `CC Cancelled`, `CC No Show`, `DC Scheduled`, `DC Cancelled`, `DC No Show`, `FU Scheduled`, `Didn't Book DC`, `Didn't Purchase`, `Purchase 101`, `Purchase 101 Amount`, `Purchase GC`, `Purchase GC Amount`.
- Flags: `Refunded`, `Marked Inactive`, `Challenge Month` (columna AJ, tipo Date `M/1/YYYY`, la puebla la automatización de Miguel desde el custom field GHL `Last Challenge Date`).

`Historical` = mismas columnas + una columna `Challenge` (formato `YYYY-MM`).
`Challenge Costs` = `Challenge` | `Ad Cost` | `Affiliate Cost` | `Other Costs` | `Notes`.

### 4.2. Cómo se computa el stage (CRÍTICO)

No hay columna "stage". Se calcula mirando **qué timestamps existen** en la fila. Funciones espejo que deben mantenerse en sync:
- `computeStage_` (GHL.gs) ← **la que usa el dashboard en vivo**.
- `computeStageSimple_` (Code.gs) ← para AI Analysis.
- `computeStageLocal` (index.html) ← optimistic UI en el frontend.

**Reglas de precedencia (tras el fix de reschedule):**
1. **Terminales absolutos** (ganan siempre): `Purchase 101`, `Purchase GC`, `Didn't Purchase`.
2. **Tier post-CC** (desempate por **timestamp más reciente**): `FU Scheduled`, `DC No Show`, `DC Cancelled`, `DC Scheduled`, `Didn't Book DC`.
3. **Tier CC** (desempate por timestamp más reciente): `CC No Show`, `CC Cancelled`, `CC Scheduled`.
4. Si no hay nada → `Participant`.

**Por qué el desempate cronológico:** un reschedule escribe `CC Scheduled` **después** de `CC Cancelled`; con precedencia fija el participante se quedaba pegado en "CC - Cancelled" (bug de Cody Blakley). Con "gana el más reciente", vuelve a `CC - Scheduled`. `Didn't Book DC` se ubica **debajo** de `DC Scheduled` para permitir "revival": si el participante luego agenda DC, sube solo.

**Stages (nombres visibles):** `Participant`, `CC - Scheduled`, `CC - Cancelled`, `CC - No Show`, `Didn't Book DC`, `DC - Scheduled`, `DC - Cancelled`, `DC - No Show`, `FU - Scheduled`, `Didn't Purchase`, `Purchase 101`, `Purchase GC`.

### 4.3. Filtrado del challenge activo

`getParticipantsFromSheet_` incluye filas con `Date Purchased >= CHALLENGE_START_DATE`. Además, durante crossover, la mayoría de vistas filtran por **cohort activo** (`Challenge Month === ACTIVE_CHALLENGE_MONTH`) — ver §9.

### 4.4. Labels legacy (UI ≠ columna)

| UI dice | Columna real en el sheet |
|---|---|
| "Day 4 Call" | `Day 4 Call #1` |
| "Day 19 Offer Doc" | `Day 6 Offer Doc Sent` |
| "Login Reachout · Reminder #1" | `Login Reachout Sent` |
| (Day 5 Call #2 eliminado de UI) | `Day 5 Call #2` (columna sigue existiendo) |

---

## 5. Las vistas (tabs) — pestaña por pestaña

Nav actual = **5 tabs**: `Tracker · Today · Accountability · Analytics · History` + engranaje **Settings (⚙️)**.
(Antes eran 7: se consolidó "Action Queue" y "Onboarding" dentro de **Today** — "Layout B".)

Router: `setView(view)`. `'queue'` y `'onboarding'` redirigen a `'today'`. Arranque siempre en `'tracker'` (no se restaura de localStorage).

### 5.1. Tracker (Challenge Tracker)

- Tabla de todos los participantes del cohort activo: nombre, stage (badge de color), tiempo en stage, indicadores Everfit login / Kickoff, badges de Refunded / Inactive / refund-por-producto.
- **Stats arriba** (6 tarjetas, solo cohort activo): `s-total`, `s-participant`, `s-cc`, `s-dc`, `s-purchase`, `s-conv` ("CC → DC Conv.").
- **Filter chips** (solo cohort activo, salvo "All" que muestra todos para renderizar la sección Incoming): All / No CC / CC Scheduled / CC Issues / Didn't Book DC / DC Scheduled / DC Issues / FU Scheduled / Inactive / etc. Los chips solo aparecen si `count > 0`.
- **Búsqueda** por nombre/email (case-insensitive).
- **Crossover:** la tabla se parte en "Active Challenge · [mes]" + secciones "Incoming · [mes]" (header ámbar). Badge de cohort (JUN/JUL) junto al nombre solo durante crossover.
- Click en una fila → **modal del participante** (ver §6).
- Badges de refund por producto: "1-on-1 refund" / "GC refund" (rojos), separados del badge "Refunded" a nivel challenge.

### 5.2. Today (el hub operativo)

`renderToday()` (async — fetchea GHL Calendar). Estructura de arriba a abajo:

1. **Owner filter bar** (pills): `All / Gabi / Bernardo / Deniz / Joey / Anthony`. Solo CSS + localStorage (`today-owner-filter`); no escribe nada. Filtra por clases `owner-*` en `.main`.
2. **Header** del día ("Thursday, June 18").
3. **📞 Calls Today** (obSection maestra, colapsable, default colapsada) con 3 sub-secciones que leen de **GHL Calendar** (no del sheet):
   - **Clarity Calls today** (`owner-deniz owner-anthony`)
   - **Discovery Calls today** (`owner-deniz owner-joey`)
   - **Follow-Up Calls today** (`owner-deniz owner-joey`)
   - Cada card matcheada a participante (por email) → click abre el modal. Badges por ventana real de la call: **Upcoming** / **● Live now** / **✓ Processed** (stage avanzó tras el fin) / **⚠ Needs update** (+ "Xh ago").
   - Cards **externas** (email no está en Participants, ej. rebook de un challenge pasado): badge "External call"; si la call ya terminó → "⚠ Update past challenge" clicable → panel inline "Update Past Challenge" que escribe a `Historical` (ver §6).
   - `getTodayCalls` lee CC de **dos** calendarios (público + admin override) y **dedupea por event ID**. Filtro estricto al día actual (defensa contra timezone de GHL).
4. **⚡ Actions Today** (obSection maestra, default colapsada) con 6 sub-secciones (todo card-based, no tablas):
   - **Action Queue** (Deniz/Joey): reschedule cadence + follow-ups. Atribuida al **closer del DC original** (regla de ownership). CC siempre Deniz. Deferida hasta que llegue la atribución de owner (muestra "⏳ Loading owner assignments…" hasta `window.__lastDcLoaded`).
   - **Login Reachout** (Gabi): two-tier (Reminder #1 → 24h → Reminder #2). Muestra "Logged in X days ago".
   - **Welcome Message** (Gabi): copy + mark sent. Muestra "Logged in X days ago".
   - **Intake Form** (Gabi): lee del Macro Engine. 3 buckets — 🟢 Ready to Assign (status `READY TO ASSIGN`, con botones Training/Calories fusionados), 🟡 Need Review (`BERNARDO REVIEW`), ⚪ Intake Pending (sin form; state machine Reminder #1/#2). Carga en background (`loadIntakeMacroInBackground`).
   - **Setup Tasks** (Training & Calories): **fusionada dentro del card Ready to Assign** del Intake; la sección propia quedó como dead code. Requiere intake submitted para aparecer.
   - **CC Booking Outreach** (Gabi, dueña única del flujo de agendamiento): Day 2 DM → Day 4 Call → Day 19 Offer Doc. La Day 4 Call es de **Bernardo** (tag `owner-bernardo`) y tiene botón inline "📅 Book CC now". Muestra "Challenge Day X".
   - Todo colapsado por default; estado persistido en localStorage por sección.

### 5.3. Accountability (solo Bernardo)

- `renderAccountability()` con dos secciones:
  - **"Dennis — open follow-ups"**: reschedule cadence stale 48h+ (DM, Call #1, Call #2, Offer Doc). `getDennisFlags()`.
  - **"Gabi — open follow-ups"**: onboarding outreach stale 48h+ (Login Reachout, Welcome, o CC booking overdue). `getJackieFlags()` (nombre interno legacy = "Jackie", ya no renombrado).
- Buffer: 48h desde el evento (24h para actuar + 24h antes de que el flag llegue a Bernardo). Filtrado a `isActiveCohort`. Excluye refunded/inactive.
- Solo visibilidad. Click → modal (para auditar notas y, si la acción se hizo pero no se marcó, marcarla retroactivamente).

### 5.4. Analytics (Bernardo)

`renderAnalytics()` + `computeFunnel()` (solo cohort activo, excluye inactive/refunded). Cards:
- **Funnel** en tiempo real: Participantes → Booked CC → Attended CC → Booked DC → Attended DC → Purchase, con % en cada transición.
  - "Attended CC" incluye `Didn't Book DC`, `DC Scheduled`, `FU Scheduled` y terminales de DC. "Attended DC" = `Didn't Purchase` / `Purchase 101` / `Purchase GC` / `FU Scheduled`.
- **Revenue**: challenge-net + montos 1-on-1 y GC (del **Mastersheet**). Filas rojas de refunds por producto ("1-on-1 refunds · N", "GC refunds · N") que restan.
- **Source Breakdown**: por fuente (`renderSourceRows`). Afiliados identificados por `Source`; rate uniforme **$97/referral**.
- **Costs & Profitability**: Ad cost, Affiliate cost, Other costs (del tab Challenge Costs), **coach payouts 1-on-1 y GC** (payout mensual × duración de contrato, solo clientes no-refunded, del Mastersheet), Total costs, **Net profit** (aquí mismo, junto a costos, a propósito). CACs: **Blended CAC** = `(ad+affiliate)/net participants`; **Paid Ads CAC** = `ad/paid-source participants` (sources `meta ads`, `ads`, `manychat ads`).
- **AI Analysis**: botón "✨ Analyze this challenge" → `runAIAnalysis()` → action `analyzeChallenge` → Apps Script llama a Anthropic (Sonnet `claude-sonnet-4-5-20250929`) server-side y devuelve markdown. Read-only. Filtra al cohort activo. El prompt distingue challenge ACTIVE (calcula "Día X de 21", no interpreta outcomes faltantes como fracaso) vs COMPLETED. **⚠ Roto al cierre por falta de créditos en la cuenta de Anthropic Console — ver §14.**

### 5.5. History (Bernardo)

`renderHistory()` + `renderChallengeDetail(c)`. Tabla comparativa de challenges archivados (lee tab `Historical`, agrupado por `Challenge` en formato `YYYY-MM`).
- 10 columnas: Total, Booked CC, Attended CC, Booked DC, Attended DC, Purchased + % de conversión step-by-step.
- Filas clicables → detalle expandido con funnel de 5 pasos, revenue, Costs & Profitability per-challenge, y botón AI Analysis por challenge (`runHistAIAnalysis`).
- **Heurística de honestidad:** cuando la data de attendance de un challenge histórico es incompleta (no hay no-shows/cancels registrados), muestra `—` en gris en vez de números engañosos (`isIncompleteCC`/`isIncompleteDC`). Challenges "limpios" muestran números reales automáticamente.
- `prettyChallengeName` normaliza nombres (Date object "Sun Mar 01 2026…" → "2026-03").

### 5.6. Settings (⚙️)

`openSettings()`. Contiene:
- **Challenge Start Date** (`updateChallengeStartDate` → Script Property `CHALLENGE_START_DATE`). Es el día que abre el promo (un viernes). Filtra qué participantes muestra el dashboard y recomputa "Día X".
- **Active Challenge Month** (`updateActiveChallengeMonth` → Script Property `ACTIVE_CHALLENGE_MONTH`, formato `YYYY-MM`). **Separado del start date a propósito** — el start date (ej. 29-may) puede caer en un mes distinto al nombre del cohort (junio). Define qué cohort es el "activo".
- **Archive Current Challenge** (`archiveChallenge()` → `archiveChallenge_`): input pre-rellenado con el nombre canónico. **Destructivo.** Hace snapshot (`Pre-Archive [fecha] [challenge]`), mueve solo las filas cuyo `Challenge Month` matchea → `Historical`, limpia esas filas de `Participants`. Muestra `willArchive` vs `willPreserve` en el confirm.

---

## 6. El modal del participante — secciones y botones

`openModal(email)`. `refreshModalContent()` re-renderiza secciones stage-dependientes in-place. **El modal ya no se auto-cierra** tras marcar stage (antes cerraba a ~1.5s) — queda abierto para que el closer escriba notas; al cerrar con la X dispara `loadData()` en background si `__modalDirty`.

Secciones (de arriba a abajo):
- **Header**: nombre, stage, tiempo en stage.
- **Mark stage** (grid de botones → cada uno `markEvent(col)` → POST `recordEvent` → escribe timestamp en la columna homónima del sheet **Participants**, con optimistic UI):
  - `CC Cancelled`, `CC No Show`, `DC Cancelled`, `DC No Show` (rojos/danger)
  - `Didn't Book DC`, `Didn't Purchase` (neutros, span 2)
  - `Purchase 101`, `Purchase GC` (verdes/success)
- **Booking (cita real en GHL Calendar)** — aparece según stage:
  - **📅 Reschedule CC / Reschedule DC**: solo en `CC - Cancelled/No Show` o `DC - Cancelled/No Show` (y no refunded). `callType = stage.startsWith('CC') ? 'CC' : 'DC'`. CC usa el **calendar admin override**.
  - **📅 Book DC now** (verde): solo en `CC - Scheduled`.
  - **📅 Book Follow-Up Call** (morado): solo en `DC - Scheduled` + FU calendar configurado. Al bookear escribe también `FU Scheduled` en el sheet y el stage pasa a `FU - Scheduled` (esconde el botón).
  - Todos abren un **slot picker inline** (fetch `getFreeSlots`), con **selector dinámico "Book with"** (dropdown de team member; aparece solo si el calendar tiene 2+ personas; default "Any (next available)"; filtra slots por userId). Confirmar → POST `bookAppointment`.
- **"Add note"** → POST `createNote` → **crea nota en el contacto de GHL** (`/contacts/{id}/notes`). No toca el sheet.
- **Notes history**: historial de notas cargado de GHL.
- **"More options"** (grupo colapsable, default cerrado — acciones poco frecuentes):
  - **Manual Booking Override** (azul): botones "📅 Mark CC Scheduled" (stage Participant) / "📅 Mark DC Scheduled" (stage CC-Scheduled o Didn't Book DC). Escribe el timestamp directo al sheet. Para casos de doble perfil GHL / email mismatch donde la automatización no encontró la fila.
  - **Onboarding & Clarity Call outreach (Gabi)**: overrides que marcan timestamp manual — `Login Reachout`, `Welcome Message`, `Training Assigned`, `Calories Assigned`, `Day 2 DM`, `Day 4 Call`, `Day 19 Offer Doc`. (El botón con "Copy message" real vive en las **cards** de Today, no aquí.)
  - **Reschedule outreach (Dennis)** — "Override only": `Reschedule DM`, `Call #1`, `Call #2`, `Offer Doc`.
  - **Refund**: "Mark Refunded" / "Undo refund" → columna `Refunded`. Excluye de outreach, accountability y analytics.
  - **Mark Inactive**: "○ Mark Inactive" / "Undo" → columna `Marked Inactive`. Para unresponsive (no login a Everfit, O login sin intake/macros). Se oculta de queues, se mantiene en Tracker con badge.

**Update Past Challenge** (panel inline en cards externas de Today, no en el modal normal): `openExternalUpdatePanel(...)` → lookup en `Historical` → botones de outcome (`recordExternal` → POST `recordHistoricalEvent`) que escriben timestamp a la fila del contacto en **`Historical`**. Si no está en Historical, dice que lo maneje en GHL.

---

## 7. Tabla maestra: cada botón → qué escribe y dónde

| Botón / acción | Función | Escribe en |
|---|---|---|
| Mark stage (CC/DC Cancelled, No Show, Didn't Book DC, Didn't Purchase, Purchase 101/GC) | `markEvent(col)` → `recordEvent` | **Sheet Participants** (timestamp) |
| Manual Booking Override (Mark CC/DC Scheduled) | `manualMarkBooking(col)` → `recordEvent` | **Sheet Participants** |
| Onboarding "Mark sent" / "Mark done" (Login Reachout #1/#2, Welcome, Day 2 DM, Day 4 Call, Day 19 Offer Doc, Training, Calories, Intake Reminder 1/2) | `markOnboardingSent(email, type, btn)` → `recordEvent` | **Sheet Participants** (columna vía `ACTION_TO_COLUMN`) |
| Reschedule outreach overrides (Deniz) | `markEvent` | **Sheet Participants** |
| "Copy message" / "Copy reminder" / "Copy macros" | `copyOnboardingMessage` / `copyIntakeReminder` / `copyMacros` | **Nada** (solo clipboard) |
| Mark Refunded / Undo | `markRefunded` / `undoRefund` | **Sheet Participants** (`Refunded`) |
| Mark Inactive / Undo | `markInactive` / `clearInactive` → `recordEvent`/`clearEvent` | **Sheet Participants** (`Marked Inactive`) |
| Add note | `saveNote` → `createNote` | **GHL** (nota en contacto) |
| Reschedule CC/DC, Book DC now, Book FU, Book CC (Day 4) | `confirmReschedule`/`confirmBookDc`/`confirmFollowUp`/`confirmDay4Book` → `bookAppointment` | **GHL Calendar** (+ sheet `FU Scheduled` solo para FU) |
| Update Past Challenge outcomes | `recordExternal` → `recordHistoricalEvent` | **Sheet Historical** |
| Save Challenge Start Date | `saveStartDate` → `updateChallengeStartDate` | **Script Property** `CHALLENGE_START_DATE` |
| Save Active Challenge Month | `saveActiveMonth` → `updateActiveChallengeMonth` | **Script Property** `ACTIVE_CHALLENGE_MONTH` |
| Archive | `archiveChallenge` → `archiveChallenge_` | **Sheet** (Participants → Historical + tab Pre-Archive) |
| Owner filter pills | `setOwnerFilter` / `applyOwnerFilter` | **Nada** (CSS + localStorage) |
| AI Analysis | `runAIAnalysis` / `runHistAIAnalysis` → `analyzeChallenge` | **Nada** (llama Anthropic, read-only) |

---

## 8. Roles y personas (ownership)

- **Bernardo** — Owner / Auditor. Vistas: Accountability (diario), Analytics (semanal), History (post-challenge), Settings. Hace la **Day 4 Call**. Revisa los intakes flagged (`BERNARDO REVIEW`).
- **Gabi** — Lead Coach / onboarding. **Dueña única del flujo completo de agendamiento del CC** (Day 2 DM → Day 4 → Day 19 Offer Doc) + Login Reachout + Welcome + Intake + Setup Tasks (Training/Calories). Reemplazó a **Jackie** (que salió). *Nombres internos de funciones (`getJackieFlags`, var `jackie`) NO se renombraron.*
- **Deniz** (a veces "Dennis") — **Closer**. Dueño del CC (único CC closer, junto con Anthony) y de sus DCs/FUs. Dueño de la reschedule cadence (DM → Call #1 → Call #2 → Offer Doc). Regla: **el closer del DC original es dueño de todo lo downstream**.
- **Joey** — **Closer**. Solo DCs y FUs (sin outreach de onboarding).
- **Anthony** — **Clarity Caller only**. Solo hace CCs junto a Deniz. **NUNCA** entra en la lógica de ownership de DC/FU/reschedule/Action Queue.
- **Miguel** — automatizaciones de GHL (workflows que escriben al sheet, custom field `Last Challenge Date`, landing page). No toca el código del dashboard.

> **Vocabulario que Bernardo insiste:** "closers, no coaches" (Deniz/Joey son closers); "challenge, no compliance". CC = Clarity Call, DC = Discovery Call, FU = Follow-Up.

---

## 9. Arquitectura de cohorts / crossover

El challenge nuevo empieza a vender mientras el anterior aún corre → hay dos cohorts vivos a la vez ("crossover").

- **Una sola tabla `Participants`** con columna **`Challenge Month`** (no se creó tabla `Purchases` separada). Se descartó por privacidad floja: la data sensible real (notas GHL, intake) no vive en Participants.
- `Challenge Month` la puebla la automatización de Miguel desde el custom field GHL **`Last Challenge Date`** (formato `M/YYYY`, escrito **manualmente** al comprar, representa el challenge de destino, NO la fecha de transacción — ej. compra 25-jun para el challenge de julio = "julio").
- `normalizeChallengeMonth_` canoniza cualquier formato ("7/2026", "07/26", "July 2026", "Julio 2026", Date object, ISO) → `YYYY-MM`.
- **`isActiveCohort(p)` es defensivo:** si no hay `ACTIVE_CHALLENGE_MONTH` o el participante no tiene `Challenge Month` → se trata como activo. Cero regresión hasta que la columna esté poblada/backfilleada.
- **Qué filtra por cohort activo:** stats top, chips, Analytics, AI Analysis, Calls Today, Action Queue, CC Booking Outreach, y los flags de accountability day-2/4/19.
- **Qué NO filtra por cohort** (opera por evento individual / stage, para que el cohort nuevo entre desde día 1): Login Reachout, Welcome Message, Intake Form, Setup Tasks. **Ese es exactamente el motivo del crossover:** que Gabi pueda hacer el onboarding (Login to Everfit) del cohort entrante desde el día 1.
- **Landing spot counter:** endpoint `getSpotCount` (GET `?action=getSpotCount&month=7/2026&capacity=60`) reemplaza el gviz directo del landing. Cuenta filas no-refunded del mes. Cacheado 60s. Lo consume el landing de Miguel (no es un botón del dashboard).
- **Transición (Reset Monday):** en Settings, cambiar Active Challenge Month al mes nuevo → Archive (mueve el cohort viejo a Historical con backup previo). Ver el SOP de Bernardo (`docs/Bernardo_SOP.md`) para el playbook completo.

---

## 10. Backend Apps Script — archivos, funciones, endpoints

> Copias de trabajo en `~/Downloads/`: `Code_21DC_Dashboard.gs`, `GHL.gs`, `Config.gs`, `Intake.gs`, `Macro_Engine.gs`. (El nombre `Code_21DC_Dashboard.gs` es porque en Downloads había `Code.gs` viejos de "Coach Pulse".)

### 10.1. `Code.gs` — router HTTP

- `doGet(e)` cases: `testConnection`, `getOpportunities` (param `lite=true` para first-paint rápido), `getContact`, `getConfig`, `getHistorical`, `analyzeChallenge`, `listCalendars`, `getTodayCalls`, `getFreeSlots`, `getCalendarTeamMembers`, `getSpotCount`, `getIntakeMacro`, `findHistorical`.
- `doPost(e)` cases: `createNote`, `updateChallengeStartDate`, `updateActiveChallengeMonth`, `recordEvent`, `clearEvent`, `archiveChallenge`, `bookAppointment`, `recordHistoricalEvent`.
- Helpers: `activeChallengeName_`, `challengeMonthLabel_` (meses en **inglés**), `normalizeChallengeMonth_`, `getChallengeCosts_`, `analyzeChallenge_`, `summarizeChallenge_`, `buildAnalysisPrompt_`, `getHistoricalParticipantsByChallenge_`, `computeStageSimple_`, `getCalendarIds_` (`{cc, ccAdmin, dc, fu}`), `listGHLCalendars_`, `getCalendarEventsForRange_`, `getCalendarFreeSlots_(calId, dateStr, userId)`, `getCalendarTeamMembers_`, `createAppointment_(opts)`, `enrichEventsWithEmail_`, `getUserNameMap_`, `resolveUserName_`, `getLastDcAssignedByEmail_` (atribución del closer del DC), `getMastersheetPurchases_` / `processMastersheetTab_`.
- **Cache warmers (triggers):** `warmLastDcCache` (cada 10 min), `warmMastersheetCache` (cada 10 min), `syncPurchaseAmountsToSheet` (cada 1h — copia montos al sheet solo si Purchase marcado y celda vacía; nunca sobrescribe). Instalar una vez con `installWarmCacheTrigger()`.

### 10.2. `GHL.gs` — API GHL + sheet I/O

- `GHL_BASE = 'https://services.leadconnectorhq.com'`, `GHL_VERSION = '2021-07-28'`.
- `ghlRequest_(method, endpoint, payload)` y `ghlRequestVersioned_(..., version)` — **los calendarios requieren `2021-04-15`** (¡distinto de contacts!). `/users/` requiere `2021-07-28` + scope `users.readonly`.
- `findContactIdByEmail_` (usa `/contacts/search/duplicate`), `getContact_`, `getContactNotes_`, `getAllContactNotes_` (fetch paralelo con `fetchAll`), `createContactNote_`.
- `getParticipantsFromSheet_`, `computeStage_`, `recordEvent_`, `findHistoricalByEmail_`, `recordHistoricalEvent_`, `getHistoricalData_`, `computeChallengeSummary_` (expone counts granulares para la heurística de History), `archiveChallenge_` (cohort-aware + snapshot).
- Utilidades one-time (backfills históricos): `backfillJackieTasks`, `backfillFromSalesPipeline`, `undoBackfill_Pipeline2`, `auditPipelineStages`, `diagnoseSalesPipeline20`.

### 10.3. `Config.gs` — credenciales y migraciones de columnas

- `getConfig_()`, `setupConfig()`, `updateChallengeStartDate(date)`.
- `appendColumns_(headers)` (idempotente sobre Participants **y** Historical), `addOnboardingColumns`, `addOutreachColumns`, `addSourceColumn`, `addRefundColumn`, `addOnboardingTaskColumns`, `addIntakeReminderColumns`, `addLoginReachout2Column`.
- `backupParticipantsDaily()` (snapshot diario, tab `Backup YYYY-MM-DD`, retención 3 días) + `installBackupTrigger()` (2 AM diario).
- **Ojo:** la versión de `Config.gs` que está en el repo (`apps-script/Config.gs`) es la vieja de mayo; ignórala.

### 10.4. `Intake.gs` — join con el Macro Engine

- `getMacroEngineId_`, `normalizeEmail_`, `normalizeName_`, `getMacroData_(email, fullName)` → `{found, status, calories, protein, program, flag, matchedBy}`, `getIntakeData_`, `getAllIntakeMacro_()` (batch — lee cada tab del Macro Engine **una vez**), `testIntakeJoin()`.
- **Join key:** email primero, fallback nombre completo (normalizado). El Dashboard solo **lee** el Macro Engine (corre "Execute as: Me", Bernardo es dueño de ambos).
- Tabs del Macro Engine: `Setup Sheet` (Name, Email, Status, Calories/day, Protein (g)/day, Program, Flag) y `Form Responses 1` (Timestamp, Email Address, …, Full name). Statuses: `READY TO ASSIGN` (verde), `BERNARDO REVIEW` (amarillo), `INCOMPLETE` (gris).

### 10.5. `Macro_Engine.gs` (Apps Script SEPARADO del Macro Engine sheet)

- `buildSetupSheet()`, `readManualOverrides_(ss)` (preserva overrides manuales antes de recomputar), `processRow_`, `computeMacros(...)` **← FINAL, NO MODIFICAR** (tiene `runAcceptanceTests()` con 9 casos), parsers, `onFormSubmit(e)`, `recalculateAll()`.
- Es un proyecto Apps Script distinto al del dashboard. No confundirlos.

---

## 11. Script Properties (Apps Script del dashboard)

| Key | Valor / notas |
|---|---|
| `GHL_API_KEY` | **SECRETO** — PIT token de GHL (prefijo `pit-fcd06520…`). Scopes: Contacts View/Edit, Calendars View/Edit Events, Opportunities View, Locations View, **Users View (`users.readonly`)**. **Nunca en el repo.** |
| `GHL_LOCATION_ID` | `cZF68TO3vzxTOnAdACdK` |
| `GHL_PIPELINE_ID` | `YJsIIlDbwjFe2G2o4eSf` |
| `CHALLENGE_SPREADSHEET_ID` | `1QWWYn5_SgwCOPaFtq_7CV-WsVnrtmwjUoXPFm7gVM7A` |
| `MASTERSHEET_SPREADSHEET_ID` | `1ctM6K8hQfh73bi7f-MtXkqW3BaPxU73NZf8xPJQUEOc` |
| `MACRO_ENGINE_SPREADSHEET_ID` | `18WvFlZTO18hqKqCKfCUQvz6Nu_CzixIi_dVnHT8iDAA` |
| `CHALLENGE_START_DATE` | `YYYY-MM-DD` (ej. `2026-05-29`) |
| `ACTIVE_CHALLENGE_MONTH` | `YYYY-MM` (ej. `2026-06`) |
| `CC_CALENDAR_ID` / `CC_ADMIN_CALENDAR_ID` / `DC_CALENDAR_ID` / `FU_CALENDAR_ID` | ver §3 |
| `CC_DURATION_MIN` / `DC_DURATION_MIN` / `FU_DURATION_MIN` | defaults CC=30, DC=60, FU=20 |
| `USER_NAME_MAP` | JSON opcional `{userId: "Nombre"}` (fallback si `/users/` falla) |
| `ANTHROPIC_API_KEY` | **SECRETO** — para AI Analysis. Cuenta de **Anthropic Console** (billing separado de Claude.ai). **Nunca en el repo.** |

> **Seguridad (convención dura del proyecto):** las API keys/tokens viven **solo** en Script Properties, jamás en `index.html`, jamás en el repo público, jamás pegadas en el chat. Este handoff los omite a propósito. Para identificar/rotar el PIT basta su prefijo `pit-fcd06520…`.

---

## 12. GHL — pipeline, calendarios, custom fields, workflows

- **Pipeline** (`21 Day Challenge - Sales Team`, id `YJsIIlDbwjFe2G2o4eSf`): existe pero el dashboard **no lo lee en runtime**.
- **Calendarios:** CC público (self-book, abierto solo semana 2, con bloqueos manuales por fecha), **CC Admin Override** (Deniz, Mon-Sat 8AM-9PM, sin restricciones, lo usa el dashboard), DC (round-robin Deniz+Joey), FU (20 min). El endpoint POST `/appointments` **NO valida disponibilidad** (permite override a cualquier hora); `free-slots` sí.
- **Custom field `Last Challenge Date`** (`contact.lastchallengedate`, texto libre poblado como `M/YYYY`, manual al comprar) → alimenta la columna `Challenge Month` vía automatización de Miguel.
- **Workflows de Miguel (fuera de nuestro código):** escriben al sheet los timestamps de CC Scheduled, login Everfit, etc. Uno de ellos escribe el placeholder `12/31/1899` en `Login to Everfit` cuando no hay login (por eso existe `isValidLoginDate`, que rechaza fechas pre-2020).
  - Se extendió el workflow "Clarity Call Scheduled" para capturar reschedules: trigger `Appointment Status` (Confirmed, calendar Clarity Call) en OR con `Appointment Booked`, ambos escriben columna H (`CC Scheduled`). No se pudo limpiar `CC Cancelled` en reschedule (GHL no permite guardar campo vacío) → se resuelve con el desempate cronológico del backend.
  - La automatización de Discovery Call **no existía** al inicio (solo la de Clarity) — Bernardo la creó.

---

## 13. Integraciones externas en detalle

### 13.1. Mastersheet (montos, refunds, coach payouts)

- `getMastersheetPurchases_()` abre el Mastersheet y **solo** procesa dos tabs por nombre exacto: `"client mastersheet"` (→ 1-on-1) y `"group coaching - client mastersheet"` (→ GC). El workbook tiene 30+ tabs (Payroll, PnL, Payment Records…) que **contaminaban** si se leía cualquier tab con Email+Amount.
- `processMastersheetTab_` autodetecta columnas por header en las primeras 5 filas: email, amount (`$ Package`), date (`Date Purchased`), refund, payout (`sales %`/`coach payout`/`monthly payout`), duration.
- **First-invoice-per-email wins** (fecha más temprana): si un cliente renueva luego, las stats del challenge quedan ancladas a la compra original.
- `coachCost = payout mensual × duración`, solo si NO refunded (refund = contrato disuelto).
- Enrichment **on-read** (solo en la llamada full, no en lite). Writer opcional (`syncPurchaseAmountsToSheet`) copia los montos al sheet sin sobrescribir celdas con valor. Cache 15 min + warmer.

### 13.2. Macro Engine (intake + macros)

Ver §10.4. El intake form ya **no** se llena en Everfit — ahora es un **Google Form** que alimenta el Macro Engine. El dashboard lee el status/macros y muestra los 3 buckets del Intake Form.

### 13.3. Anthropic (AI Analysis)

- `analyzeChallenge_` → `https://api.anthropic.com/v1/messages`, modelo `claude-sonnet-4-5-20250929`, `max_tokens: 2500`, header `anthropic-version: 2023-06-01`. Key en Script Property `ANTHROPIC_API_KEY` (cuenta de Anthropic Console, **billing separado de Claude.ai**).
- El prompt excluye data pre-`2026-05` (antes no había tracking de source ni de costos).

---

## 14. Pendientes / TODO abiertos al cierre (14-jul-2026)

**Críticos / abiertos:**
1. **AI Analysis roto — créditos de Anthropic Console.** "Your credit balance is too low". Bernardo debe identificar/crear la cuenta del `ANTHROPIC_API_KEY` (recomendado bajo `bernardo@fit4lifeacademy.health`), decidir Individual vs Organization, cargar créditos (~$20), generar key nuevo y reemplazar el Script Property. **Sin resolver.**
2. **"Errorcitos" en Analytics** que Bernardo quería trabajar en una sesión nueva. Nunca especificados.

**Operacionales (dependen de Bernardo/Miguel):**
3. **Deploy de backend** tras los últimos cambios (si aún no): pegar los `.gs` de `~/Downloads/` y hacer New Version. Correr `installWarmCacheTrigger` una vez.
4. **Trigger de reschedule en GHL** — confirmar que dispara bien con el calendar admin.
5. **Participante "61 vs 60":** una fila sin `Challenge Month` (columna AJ). Bernardo debe revisar.
6. **Backfill de `Challenge Month`** en filas viejas del `Historical` (manual, Miguel/Bernardo).
7. **Solución arquitectónica de owner attribution:** columna `Last DC Closer` en el sheet (escrita por automatización) eliminaría el cold-start/cache/warmer del Action Queue. Requiere Miguel. Pendiente de evaluar.
8. **Actualizar los documentos madre** en Google Drive (Overview, Deniz SOP, Coach/Gabi SOP, Master Decision Log — el Proyecto D quedó en "Pendiente" ahí, Personnel) para reflejar todo lo agregado al dashboard. Incluye documentar en el SOP de Bernardo los cambios de Settings/Archive/cohort transitions.
9. **Validación end-to-end** de los 4 flujos de booking (Reschedule CC/DC, Book DC inline, Book FU) con participante real — se delegó a Deniz (Bernardo no puede probar sin agendar de verdad).

**Menores / diferidos (no bloqueantes):**
10. Opción "Already sent? Backdate" (date picker) para intake reminders — ofrecida, no implementada.
11. Housekeeping de dead code (`getSetupTasksQueue`, `renderSetupTaskCard`, ramas muertas de `renderQueueTable`).
12. LOW findings de la auditoría: `getIntakePending` falla en silencio si el fetch da error; search en Today re-renderiza todo por keystroke; confirmar si `getJackieFlags` Welcome debe filtrar por cohort.
13. Considerar revocar el PIT viejo de GHL cuando todo esté validado.
14. `computeStageLocal` (frontend) diverge levemente de `computeStage_` (backend) — mantenerlos en sync al tocar la lógica de stage.
15. Llenar el tab `Challenge Costs` con números reales por challenge (sin eso, las cards muestran placeholder).

---

## 15. Bugs resueltos importantes (para no repetirlos)

- **CC/DC Scheduled ≠ hora de la call.** Esas columnas guardan **cuándo se registró el booking** (cuando corre la automatización), NO la hora real de la llamada. La hora real vive solo en GHL Calendar. Un intento temprano de construir "Today" sobre esas columnas se revirtió por completo (Fase 2 rollback).
- **GHL Calendar IDs son case-sensitive.** Un typo (`bPerFFiHn0ExeBUjxdye` vs `…EX…`) daba 400 "calendar is not found". Siempre copy-paste.
- **Version de API por endpoint:** contacts `2021-07-28`, calendars `2021-04-15`, users `2021-07-28`. Un mismatch daba errores confusos.
- **Scopes del PIT:** faltaba `calendars` (401) y luego `users.readonly` (dropdown mostraba "User xxxx"). Los scopes de un PIT existente **sí** se pueden editar (tab Scopes → Update); no hay que rotar el token.
- **Reschedule dejaba al participante pegado** en Cancelled → fix del desempate cronológico (§4.2).
- **Owner filter rompió el dashboard** (doble `else` = syntax error que mató todo el `<script>`). Lección: verificar sintaxis antes de push.
- **`filter-joey` pegado** al cambiar de filtro (faltaba en el `classList.remove`) → vistas vacías.
- **Contadores de sección** usaban `getComputedStyle` (confundía colapsado con filtrado) → se reescribió con `cardVisibleUnderFilter` que camina la jerarquía de clases owner.
- **Mastersheet leía tabs equivocados** ($0 en purchases) → strict tab-name match.
- **Challenge Costs $0** por comparar "June, 2026" vs "2026-06" → normalizar ambos lados.
- **Backfill histórico:** la data de no-shows/cancels de challenges pasados está **perdida** (se consolidó todo en "Didn't Purchase" al cerrar cada challenge). Por eso History muestra `—` donde no es confiable.
- **Performance:** el bottleneck era `enrichEventsWithEmail_` (1 GHL call por evento) + re-fetch de 90d de DC events por request. Fix multi-capa: skip en lite call + CacheService + warmer trigger. First-paint ~15s → ~1-2s.

---

## 16. Gotchas y convenciones (checklist antes de tocar código)

- [ ] **Backend NO está en git.** Editar los `.gs` en Apps Script / `~/Downloads/`; el frontend en `index.html`.
- [ ] **Ignorar `apps-script/` del repo** — es la versión vieja de mayo.
- [ ] **Deploy backend:** Manage deployments → Edit → New version (NUNCA New deployment).
- [ ] **Nunca renombrar columnas** del sheet — solo labels de UI.
- [ ] **API keys solo en Script Properties**, jamás en repo/frontend/chat.
- [ ] **Email = col C (índice 2)**, siempre lowercased+trim, es el key de todo.
- [ ] **`isActiveCohort` defensivo** — no romper el fallback "sin info = activo".
- [ ] **Onboarding queues son stage-based, no cohort-based** (a propósito).
- [ ] **Sin em dashes (—) en el copy** de los mensajes (instrucción de Bernardo).
- [ ] **UI 100% en inglés** (aunque el normalizer de meses aún acepta español como input).
- [ ] **Refunded / Inactive** se excluyen de queues, accountability y analytics.
- [ ] **`data-table` es solo del Tracker** — nunca debe aparecer en Today.
- [ ] **Timeout de Apps Script = 6 min.** Cuidado con lookups per-row sin batchear.
- [ ] **CacheService ~100KB por key.**
- [ ] **Git identity sin configurar** — cada commit tira warning `bernardo lopez <bernardolopez@iMac-de-bernardo.local>`. No bloquea. (Los commits históricos dicen `Co-Authored-By: Claude Opus 4.7`.)
- [ ] Para bugs de **lógica/data** pegar texto (logs/errores), no screenshots; screenshots solo para bugs de **UI** (mucho más barato en tokens).

---

## 17. Cómo trabaja Bernardo (colaboración)

- **Archivos completos, no parches.** Siempre entregarle el `.gs` o el bloque entero listo para Cmd+A → pegar. "No quiero reemplazar partes porque me equivoco."
- **Análisis sistémico antes de construir.** "Piensa 10-20 pasos adelante, dime riesgos e impacto, dame una recomendación explícita sí/no. No estés de acuerdo solo porque lo digo."
- **Autonomía cuando aprueba una fase.** "No me pidas permisos, haz todo lo que necesites" — pero **valida contra producción real** tras cada fase antes de avanzar.
- **Valida con datos reales** (nombres de participantes, el sheet, GHL) — no acepta features "verificadas" hasta verlas funcionar en producción.
- **Consciente del costo de tokens.** El driver #1 es la **longitud de la sesión** (cada mensaje reenvía todo el historial). Preferencia: sesiones por tema, cerrar cuando se alarga, memoria solo para preferencias/arquitectura/por-qué (no volcar transcript ni diffs — para eso está `git log`).
- **Riesgo de alucinación registrado:** en un punto Claude inventó flujos inexistentes ("reschedule calls de Gabi") leyendo columnas legacy del sheet como procesos vivos. Bernardo lo corrigió. **Siempre validar contra el Master Decision Log y los SOPs reales antes de asumir que una columna = un proceso.**

---

## 18. Cronología / fases (para ubicarse)

| Fecha aprox. | Qué pasó |
|---|---|
| 9-jun | Continúa el build del Proyecto D (dashboard ya con las vistas base) |
| ~mediados jun | Fase 4/5: Costs & Profitability, Net Profit, CACs, AI Analysis |
| ~jun | Rollback de "Today v1" (data model malo) → Today v2 sobre GHL Calendar; Reschedule modal; Follow-Up + Mark Inactive; Update Past Challenge |
| ~jun | "Didn't Book DC"; History con Booked CC/DC; backfill histórico desde Sales Pipeline 2.0 (data granular perdida) |
| 18-19 jun | Consolidación 7→5 tabs (Layout B); Intake Form section; Day 4 inline booking; Owner filter (Gabi/Bernardo/Deniz); workflow GHL de reschedule |
| 19-25 jun | Fix de stage cronológico; CC Admin Override calendar; Book DC inline; selector de team member; modal no auto-close; "More options" |
| 25 jun | Filtro Joey (closers); crossover de cohorts + `getSpotCount` landing |
| 25-30 jun | Active Challenge Month explícito; Anthony (Clarity Caller); UI a inglés; cohort badges; Intake reminders two-tier; auditoría sistémica (11 fixes) |
| 1-10 jul | Enrichment del Mastersheet (montos, refunds, coach payouts); performance (warmers); persist AI analysis; actualización de memoria |
| 10-14 jul | Créditos de Anthropic (roto); cierre de sesión por costo de tokens |

**Commits finales (HEAD):** `cc58d43` (coach payouts) ← más reciente al cierre de la sesión, luego el repo siguió con `e5863e5`, `d35a4f8`, `9418c04`, `6db65ba`, etc. Ver `git log`.

---

## 19. Referencias

- `CLAUDE.md` — instrucciones del proyecto.
- `context/21DC_ProyectoD_Prompt.md` — spec original de las 5 vistas.
- `context/21DC_Master_Decision_Log_v2.md` — decisiones de los Proyectos A/B/C.
- `docs/Bernardo_SOP.md` — playbook operativo de Bernardo (rutina diaria/semanal, reset day, stragglers).
- Memoria persistente: `~/.claude/projects/-Users-bernardolopez-Desktop-21dc-dashboard/memory/` (`project_state.md`, `system_behavior.md`, `cohort_architecture.md`, `bernardo_sop_pending_updates.md`, `feedback_collaboration.md`, `dc_outcomes_stay_manual.md`).
- Los 6 SOPs viven como **tabs** dentro de un Google Doc grande ("21 Day Challenge Overview"): (31) Dennis Full, (32) Dennis Mini, (33) Jackie/Lead Coach Full, (34) Dashboard User Guide, (35) Bernardo Playbook, (36) Jackie Mini. *(Google Docs solo exporta a Markdown el tab activo — exportar uno por uno.)*

---

*Generado a partir de la sesión `c33e27e0…` (30 MB, 9-jun → 14-jul-2026) + código actual del repo + SOP + Decision Log. Los valores de API keys/tokens se omitieron a propósito por seguridad (repo público).*

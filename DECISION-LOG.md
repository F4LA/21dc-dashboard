# DECISION LOG — 21DC Dashboard

Registro cronológico de decisiones y cambios al dashboard (frontend `index.html` y backend `.gs`).
**Entrada más reciente arriba.** Cada entrada: fecha · qué se cambió · por qué.

> Este log es para cambios **en curso** del dashboard. Las decisiones estratégicas/operativas previas de los Proyectos A/B/C (pre-dashboard) viven en [`context/21DC_Master_Decision_Log_v2.md`](context/21DC_Master_Decision_Log_v2.md), que es un documento distinto y se deja como referencia histórica.
>
> **Obligatorio:** todo cambio al dashboard agrega una entrada aquí (ver la regla en `CLAUDE.md`).

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

// =============================================================
// Code.gs — Router HTTP: recibe llamadas del frontend HTML
// =============================================================
// El frontend en GitHub Pages llama este script como API REST:
//   GET  ?action=getOpportunities         → Challenge Tracker data
//   GET  ?action=getContact&contactId=X   → Perfil completo + notas
//   GET  ?action=getConfig                → Estado de la configuración
//   GET  ?action=inspectFields            → Para descubrir custom fields
//   GET  ?action=testConnection           → Verifica conexión a GHL
//   POST { action: 'createNote', ... }    → Escribe nota en GHL
//   POST { action: 'updateChallengeStartDate', date: 'YYYY-MM-DD' }

function doGet(e) {
  var action = (e.parameter && e.parameter.action) || '';
  var result;

  try {
    switch (action) {

      // ── Verifica que las credenciales están configuradas y GHL responde
      case 'testConnection': {
        var config = getConfig_();
        var loc    = ghlRequest_('GET', '/locations/' + config.locationId);
        result = {
          success: true,
          data: {
            location:       loc.location ? loc.location.name : (loc.name || '?'),
            challengeStart: config.challengeStartDate
          }
        };
        break;
      }

      // ── Datos principales: todos los participantes del challenge activo
      // Incluye stage, tiempo en stage, última nota, everfitLogin y kickoffRegistered
      case 'getOpportunities': {
        var stages        = getPipelineStages_();
        var opps          = getOpportunitiesRaw_();
        var ids           = opps.map(function(o) { return o.contactId; });
        var notesMap      = getAllContactNotes_(ids);
        var ssStatusMap   = getSpreadsheetStatusMap_();   // Everfit + Kickoff desde spreadsheet

        result = {
          success: true,
          data: opps.map(function(opp) {
            var contact    = opp.contact || {};
            var notes      = notesMap[opp.contactId] || [];
            var lastNote   = notes[0] || null;
            var email      = (contact.email || '').toLowerCase();
            var ssStatus   = ssStatusMap[email] || { everfitLogin: false, kickoffRegistered: false };

            return {
              opportunityId:     opp.id,
              contactId:         opp.contactId,
              name:              contact.name  || opp.name  || '',
              email:             contact.email || '',
              phone:             contact.phone || '',
              stageId:           opp.pipelineStageId,
              stageName:         stages[opp.pipelineStageId] || 'Desconocido',
              stageChangedAt:    opp.updatedAt,   // proxy para tiempo en stage
              createdAt:         opp.createdAt,
              customFields:      contact.customFields || [],
              tags:              contact.tags         || [],
              everfitLogin:      ssStatus.everfitLogin,
              kickoffRegistered: ssStatus.kickoffRegistered,
              lastNote: lastNote ? {
                id:        lastNote.id,
                body:      lastNote.body,
                dateAdded: lastNote.dateAdded
              } : null,
              allNotes: notes.map(function(n) {
                return { id: n.id, body: n.body, dateAdded: n.dateAdded };
              })
            };
          })
        };
        break;
      }

      // ── Perfil completo de un contacto (para el modal de Vista 1)
      case 'getContact': {
        var contactId = e.parameter.contactId;
        if (!contactId) throw new Error('contactId requerido');
        var contact = getContact_(contactId);
        var notes   = getContactNotes_(contactId);
        result = { success: true, data: { contact: contact, notes: notes } };
        break;
      }

      // ── Muestra el estado actual de la configuración (sin exponer el API key)
      case 'getConfig': {
        var cfg = getConfig_();
        result = {
          success: true,
          data: {
            apiKey:             cfg.apiKey             ? '✓ configurado' : '✗ falta',
            locationId:         cfg.locationId         ? '✓ configurado' : '✗ falta',
            pipelineId:         cfg.pipelineId         ? '✓ configurado' : '✗ falta',
            challengeStartDate: cfg.challengeStartDate || '✗ no configurado'
          }
        };
        break;
      }

      // ── Para descubrir nombres de custom fields en GHL (corre una sola vez)
      case 'inspectFields': {
        var config   = getConfig_();
        var rawRes   = ghlRequest_('GET',
          '/opportunities/search?pipeline_id=' + encodeURIComponent(config.pipelineId) +
          '&location_id=' + encodeURIComponent(config.locationId) +
          '&limit=1&page=1'
        );
        var opp     = (rawRes.opportunities || [])[0];
        if (!opp) throw new Error('No hay participantes en el pipeline para inspeccionar.');
        var contact = getContact_(opp.contactId);
        result = {
          success: true,
          data: {
            opportunityFields: Object.keys(opp),
            contactFields:     Object.keys(contact),
            customFields:      contact.customFields || [],
            tags:              contact.tags         || []
          }
        };
        break;
      }

      default:
        result = { success: false, error: 'Acción desconocida: ' + action };
    }

  } catch(err) {
    result = { success: false, error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var result;

  try {
    var payload = JSON.parse(e.postData.contents);
    var action  = payload.action;

    switch(action) {

      // ── Escribe una nota en el perfil de un contacto en GHL
      case 'createNote': {
        if (!payload.contactId) throw new Error('contactId requerido');
        if (!payload.body)      throw new Error('body requerido');
        var note = createContactNote_(payload.contactId, payload.body);
        result = { success: true, data: note };
        break;
      }

      // ── Actualiza la fecha de inicio del challenge activo
      case 'updateChallengeStartDate': {
        if (!payload.date) throw new Error('date requerido (formato YYYY-MM-DD)');
        PropertiesService.getScriptProperties()
          .setProperty('CHALLENGE_START_DATE', payload.date);
        result = { success: true, data: { challengeStartDate: payload.date } };
        break;
      }

      default:
        result = { success: false, error: 'Acción desconocida: ' + action };
    }

  } catch(err) {
    result = { success: false, error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

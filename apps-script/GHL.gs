// =============================================================
// GHL.gs — Todas las llamadas a la GHL API v2
// =============================================================

var GHL_BASE    = 'https://services.leadconnectorhq.com';
var GHL_VERSION = '2021-07-28';

// ── Pipeline de tracking del challenge (21 Day Challenge — no Sales Team) ─────
// Este pipeline registra los hitos del participante durante el challenge:
//   1. Participant        → recién inscrito, sin hitos
//   2. Login to Everfit   → se conectó al app Everfit
//   3. Register start web → se registró al Kickoff Call
//   4. Meal Prep Call     → asistió al Meal Prep
//   5. Schedule Clarity Call
//   6. Register closing web
//   7. Sales Call Scheduled
//   8. Delete From Pipeline

var OLD_21DC_PIPELINE_ID = 'kFZzV056bwvGjrBNm5IZ';

// Stage IDs que indican Everfit login completado (etapa 2 en adelante, sin Delete)
var EVERFIT_STAGE_IDS = [
  '17a82969-98b8-45a8-af47-a32f2723f9df', // Login to Everfit
  '99230f9e-9e50-41fd-9ccb-3afc020984b6', // Register start web
  '0e9e20a4-981e-4d01-9162-ee093c34c16b', // Meal Prep Call
  'ebbd4365-5a32-4854-a17e-0bcb6d3d106c', // Schedule Clarity Call
  'dbfc7390-ff08-4e2b-946f-781c048eece7', // Register closing web
  '3188e7d3-8a6f-4076-af11-46439a3fd9eb'  // Sales Call Scheduled
];

// Stage IDs que indican Kickoff Call registrado (etapa 3 en adelante, sin Delete)
var KICKOFF_STAGE_IDS = [
  '99230f9e-9e50-41fd-9ccb-3afc020984b6', // Register start web
  '0e9e20a4-981e-4d01-9162-ee093c34c16b', // Meal Prep Call
  'ebbd4365-5a32-4854-a17e-0bcb6d3d106c', // Schedule Clarity Call
  'dbfc7390-ff08-4e2b-946f-781c048eece7', // Register closing web
  '3188e7d3-8a6f-4076-af11-46439a3fd9eb'  // Sales Call Scheduled
];

// ── Función base HTTP ─────────────────────────────────────────

function ghlRequest_(method, endpoint, payload) {
  var config = getConfig_();
  if (!config.apiKey) throw new Error('GHL_API_KEY no configurado. Corre setupConfig() primero.');

  var options = {
    method: method.toLowerCase(),
    headers: {
      'Authorization': 'Bearer ' + config.apiKey,
      'Version':       GHL_VERSION,
      'Content-Type':  'application/json',
      'Accept':        'application/json'
    },
    muteHttpExceptions: true
  };

  if (payload) options.payload = JSON.stringify(payload);

  var response = UrlFetchApp.fetch(GHL_BASE + endpoint, options);
  var code     = response.getResponseCode();
  var text     = response.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error('GHL ' + code + ' en ' + endpoint + ': ' + text);
  }

  return text ? JSON.parse(text) : {};
}

// ── Stages del pipeline ───────────────────────────────────────

// Devuelve un objeto { stageId: stageName } para el pipeline activo
function getPipelineStages_() {
  var config  = getConfig_();
  var result  = ghlRequest_('GET', '/opportunities/pipelines?locationId=' + encodeURIComponent(config.locationId));
  var pipeline = (result.pipelines || []).find(function(p) { return p.id === config.pipelineId; });

  if (!pipeline) throw new Error('Pipeline no encontrado. Verifica GHL_PIPELINE_ID.');

  var map = {};
  (pipeline.stages || []).forEach(function(s) { map[s.id] = s.name; });
  return map;
}

// ── Oportunidades del challenge activo ────────────────────────

function getOpportunitiesRaw_() {
  var config    = getConfig_();
  var startDate = new Date(config.challengeStartDate);
  var all       = [];
  var page      = 1;

  while (true) {
    var params = [
      'pipeline_id=' + encodeURIComponent(config.pipelineId),
      'location_id=' + encodeURIComponent(config.locationId),
      'limit=100',
      'page=' + page
    ].join('&');

    var result = ghlRequest_('GET', '/opportunities/search?' + params);
    var opps   = result.opportunities || [];
    all        = all.concat(opps);

    var meta = result.meta || {};
    if (!meta.nextPage || opps.length < 100) break;
    page = meta.nextPage;
  }

  // Solo participantes del challenge activo
  return all.filter(function(opp) {
    return new Date(opp.createdAt) >= startDate;
  });
}

// ── Notas de contactos ────────────────────────────────────────

function getContactNotes_(contactId) {
  var result = ghlRequest_('GET', '/contacts/' + contactId + '/notes');
  return (result.notes || []).sort(function(a, b) {
    return new Date(b.dateAdded) - new Date(a.dateAdded);
  });
}

// Fetch paralelo de notas para N contactos — mucho más rápido que N llamadas secuenciales
function getAllContactNotes_(contactIds) {
  if (!contactIds.length) return {};

  var config   = getConfig_();
  var requests = contactIds.map(function(id) {
    return {
      url:    GHL_BASE + '/contacts/' + id + '/notes',
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + config.apiKey,
        'Version':       GHL_VERSION,
        'Accept':        'application/json'
      },
      muteHttpExceptions: true
    };
  });

  var responses = UrlFetchApp.fetchAll(requests);
  var notesMap  = {};

  responses.forEach(function(response, i) {
    var id = contactIds[i];
    if (response.getResponseCode() === 200) {
      var data  = JSON.parse(response.getContentText());
      notesMap[id] = (data.notes || []).sort(function(a, b) {
        return new Date(b.dateAdded) - new Date(a.dateAdded);
      });
    } else {
      notesMap[id] = [];
    }
  });

  return notesMap;
}

// ── Escritura de notas ────────────────────────────────────────

function createContactNote_(contactId, body) {
  return ghlRequest_('POST', '/contacts/' + contactId + '/notes', { body: body });
}

// ── Perfil completo de un contacto ───────────────────────────

function getContact_(contactId) {
  var result = ghlRequest_('GET', '/contacts/' + contactId);
  return result.contact || result;
}

// ── Mapa de estado Everfit / Kickoff desde el Google Spreadsheet ──────────────
// Lee el spreadsheet del challenge activo y devuelve:
//   { email_lowercase: { everfitLogin: bool, kickoffRegistered: bool } }
//
// Estructura esperada del spreadsheet (sheet "Participants"):
//   Col A = First Name
//   Col B = Last Name
//   Col C = Email
//   Col D = Login to Everfit  (1 = sí, vacío = no)
//   Col E = Register Kickoff  (1 = sí, vacío = no)
//
// Para iniciar un nuevo challenge: corre createNewChallengeSpreadsheet() en Config.gs.
function getSpreadsheetStatusMap_() {
  var config = getConfig_();
  if (!config.spreadsheetId) {
    Logger.log('getSpreadsheetStatusMap_: CHALLENGE_SPREADSHEET_ID no configurado.');
    return {};
  }

  try {
    var ss    = SpreadsheetApp.openById(config.spreadsheetId);
    var sheet = ss.getSheetByName('Participants');
    if (!sheet) {
      Logger.log('getSpreadsheetStatusMap_: sheet "Participants" no encontrada.');
      return {};
    }

    var data = sheet.getDataRange().getValues();
    var map  = {};

    // Fila 0 = headers; datos desde fila 1
    for (var i = 1; i < data.length; i++) {
      var email = (data[i][2] || '').toString().toLowerCase().trim();
      if (!email) continue;
      map[email] = {
        everfitLogin:      data[i][3] == 1,
        kickoffRegistered: data[i][4] == 1
      };
    }

    return map;
  } catch(e) {
    Logger.log('getSpreadsheetStatusMap_ error: ' + e.message);
    return {};
  }
}

// ── Descubrimiento de campos ──────────────────────────────────
// Corre esto desde el editor para ver exactamente qué campos devuelve GHL.
// Te muestra los customFields del primer participante del challenge activo
// para que puedas identificar "Everfit Login" y "Kickoff Registrado".
function inspectFields() {
  var config    = getConfig_();
  var startDate = new Date(config.challengeStartDate);

  var result = ghlRequest_('GET',
    '/opportunities/search?pipeline_id=' + encodeURIComponent(config.pipelineId) +
    '&location_id=' + encodeURIComponent(config.locationId) +
    '&limit=20&page=1'
  );

  var opps = (result.opportunities || []).filter(function(o) {
    return new Date(o.createdAt) >= startDate;
  });

  if (!opps.length) { Logger.log('No se encontraron oportunidades.'); return; }
  Logger.log('Revisando ' + opps.length + ' participantes...');

  var tagCount = {};   // tag → cuántos contactos lo tienen
  var fieldMap = {};

  opps.forEach(function(opp) {
    var contact = getContact_(opp.contactId);

    // Tags
    (contact.tags || []).forEach(function(tag) {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    });

    // Custom fields
    (contact.customFields || []).forEach(function(f) {
      if (!fieldMap[f.id]) fieldMap[f.id] = { id: f.id, values: [] };
      if (f.value && fieldMap[f.id].values.indexOf(String(f.value)) === -1) {
        fieldMap[f.id].values.push(String(f.value).substring(0, 60));
      }
    });
  });

  Logger.log('=== TAGS (nombre → cuántos contactos lo tienen) ===');
  var tagList = Object.keys(tagCount).map(function(t) { return { tag: t, count: tagCount[t] }; });
  tagList.sort(function(a,b) { return b.count - a.count; });
  Logger.log(JSON.stringify(tagList, null, 2));

  Logger.log('=== CUSTOM FIELDS ===');
  Logger.log(JSON.stringify(Object.values(fieldMap), null, 2));
}

// ── Test de conexión (corre desde el editor) ──────────────────
function testConnection() {
  try {
    var config = getConfig_();
    Logger.log('--- Verificando configuración ---');
    Logger.log('Location ID: ' + (config.locationId || 'NO SET'));
    Logger.log('Pipeline ID: ' + (config.pipelineId || 'NO SET'));
    Logger.log('API Key: '     + (config.apiKey ? config.apiKey.substring(0, 8) + '...' : 'NO SET'));
    Logger.log('Challenge Start: ' + (config.challengeStartDate || 'NO SET'));

    var loc = ghlRequest_('GET', '/locations/' + config.locationId);
    Logger.log('✓ Location: ' + (loc.location ? loc.location.name : JSON.stringify(loc)));

    var stages = getPipelineStages_();
    Logger.log('✓ Stages del pipeline:');
    Object.keys(stages).forEach(function(id) { Logger.log('  ' + stages[id] + ' (' + id + ')'); });

    var opps = getOpportunitiesRaw_();
    Logger.log('✓ Participantes en challenge activo: ' + opps.length);

    if (opps.length > 0) {
      Logger.log('Primer participante: ' + (opps[0].contact ? opps[0].contact.name : opps[0].name));
    }
  } catch(e) {
    Logger.log('✗ Error: ' + e.message);
  }
}

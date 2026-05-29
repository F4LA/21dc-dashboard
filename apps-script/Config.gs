// =============================================================
// CONFIG.gs — Credenciales y configuración del challenge activo
// =============================================================
// SETUP (solo una vez):
//   1. Reemplaza los valores placeholder abajo con tus credenciales reales
//   2. Ejecuta setupConfig() desde el editor de Apps Script
//   3. Verifica con testConnection()
//
// CADA NUEVO CHALLENGE:
//   Ejecuta updateChallengeStartDate('YYYY-MM-DD') con la fecha de inicio,
//   o actualiza el campo CHALLENGE_START_DATE en setupConfig() y vuelve a correrlo.
// =============================================================

function setupConfig() {
  PropertiesService.getScriptProperties().setProperties({
    'GHL_API_KEY':          'YOUR_GHL_API_KEY_HERE',   // ← Reemplaza y corre setupConfig()
    'GHL_LOCATION_ID':      'YOUR_LOCATION_ID_HERE',
    'GHL_PIPELINE_ID':      'YOUR_PIPELINE_ID_HERE',
    'CHALLENGE_START_DATE': '2026-05-01'   // Formato: YYYY-MM-DD
  });
  Logger.log('Config guardado. Corre testConnection() para verificar.');
}

// ── Setup del próximo challenge ───────────────────────────────────────────────
// Corre createNewChallengeSpreadsheet() desde el editor UNA VEZ para crear
// el spreadsheet limpio del nuevo challenge. Luego actualiza CHALLENGE_START_DATE
// con la nueva fecha.
function createNewChallengeSpreadsheet() {
  var challengeName = '21DC - Jun 2026';  // ← Cambia esto cada challenge

  // Crear spreadsheet
  var ss = SpreadsheetApp.create(challengeName + ' — Participant Tracking');
  var sheet = ss.getActiveSheet();
  sheet.setName('Participants');

  // Headers
  var headers = ['First Name', 'Last Name', 'Email', 'Login to Everfit', 'Register Kickoff'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Formato header
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1a1a2e');
  headerRange.setFontColor('#ffffff');

  // Ancho de columnas
  sheet.setColumnWidth(1, 120);  // First Name
  sheet.setColumnWidth(2, 120);  // Last Name
  sheet.setColumnWidth(3, 220);  // Email
  sheet.setColumnWidth(4, 160);  // Login to Everfit
  sheet.setColumnWidth(5, 160);  // Register Kickoff

  // Guardar ID en Script Properties automáticamente
  PropertiesService.getScriptProperties().setProperty('CHALLENGE_SPREADSHEET_ID', ss.getId());

  Logger.log('✓ Spreadsheet creado: ' + ss.getName());
  Logger.log('✓ URL: ' + ss.getUrl());
  Logger.log('✓ ID guardado en Script Properties: ' + ss.getId());
  Logger.log('');
  Logger.log('Próximos pasos:');
  Logger.log('  1. Comparte este spreadsheet con el equipo');
  Logger.log('  2. Actualiza el Zapier para apuntar a este spreadsheet');
  Logger.log('  3. Actualiza el GHL workflow (pasos #32, #34) para apuntar a este spreadsheet');
  Logger.log('  4. Corre updateChallengeStartDate("YYYY-MM-DD") con la nueva fecha');
}

// Cambia solo la fecha de inicio sin tocar las otras credenciales.
// Llámalo desde el editor o desde el frontend al iniciar un nuevo challenge.
function updateChallengeStartDate(date) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Formato de fecha inválido. Usa YYYY-MM-DD.');
  }
  PropertiesService.getScriptProperties().setProperty('CHALLENGE_START_DATE', date);
  Logger.log('Challenge start date actualizado a: ' + date);
}

// Uso interno — nunca expone el API key al frontend
function getConfig_() {
  var props = PropertiesService.getScriptProperties();
  return {
    apiKey:             props.getProperty('GHL_API_KEY'),
    locationId:         props.getProperty('GHL_LOCATION_ID'),
    pipelineId:         props.getProperty('GHL_PIPELINE_ID'),
    challengeStartDate: props.getProperty('CHALLENGE_START_DATE'),
    spreadsheetId:      props.getProperty('CHALLENGE_SPREADSHEET_ID')  // ID del spreadsheet del challenge activo
  };
}

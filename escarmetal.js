/**
 * ESCARMETAL LTDA - SISTEMA DE GESTIÓN v17.42 (BLINDAJE CANTIDADES + DASHBOARD OBS.)
 * --------------------------------------------------------------------------
 * v17.42: blindaje reforzado — sincroniza siempre desde Fabricación, deduplica filas hijo
 *   duplicadas en Remate/Limpieza; nunca inserta otro hijo si el código ya existe.
 * v17.41: traspaso Fab→Remate sin sumar cantidades; Dashboard con ENTREGA CON OBSERVACION.
 * CORRECCIÓN v17.37:
 * - traspasoMasivoRemate: misma estructura que traspasoMasivoFabricacion.
 *   Remate → Limpieza con madre + hijos ENTREGADO; estado en Remate col 8.
 *
 * v17.40: traspasoMasivoFabricacion devuelve { ok, motivo, detalle }; alertas UI
 *   en entrega selectiva si falla o no hay cambios en Remate.
 * v17.39: mismo código plan col A para hijos; forzar siempre tras selectiva.
 * v17.38: forzarTraspasoFab en entrega selectiva.
 *
 * v17.36: Menús traspaso (ENTREGA PARCIAL). v17.35: Dashboard.
 */
// ==========================================
// 1. CONFIGURACIÓN DE ACCESOS
// ==========================================
const EQUIPO_TECNICA = [
    "renato.onate@mail.udp.cl",
    "jefe.tecnico@gmail.com",
    "waldo.javier@gmail.com"
  ];
  
  const EQUIPO_TALLER = [
    "jefe.taller@escarmetal.cl",
    "soldador.lider@gmail.com"
  ];
  
  const ADMINS_TOTALES = [
    "gerencia@escarmetal.cl"
  ];
  
  // DICCIONARIO DE ERRORES
  const TIPOS_ERROR = {
    "1": "MEDIDAS (Dimensiones incorrectas)",
    "2": "SOLDADURA (Poros, falta fusión, aspecto)",
    "3": "ARMADO (Piezas invertidas, escuadra)",
    "4": "MATERIAL (Falla de origen/Laminado)",
    "5": "TERMINACION (Limpieza, rebarbas)",
    "6": "OTRO (Especificar en nota)"
  };
  
  // ==========================================
  
  function onOpen() {
    SpreadsheetApp.getUi().createMenu(' 🛠️  GESTIÓN PRODUCCIÓN')
      .addItem(' 📥  Importar Datos Tekla', 'procesarInformeTekla')
      .addItem(' 🔄  Sincronizar Pendientes', 'ejecutarSincronizacion')
      .addItem(' 🔄  Actualizar Menús (Col H y O)', 'actualizarValidacionesFabricacion')
      .addItem(' 📊  Forzar Recálculo Total', 'recalcularTotalDelDia')
      .addItem(' ▶️  Continuar Entrega Selectiva', 'continuarEntregaSelectivaPendiente_')
      .addToUi();
  }
  
  /** Disparador al editar: al cambiar estado a ENTREGADO en Remate se traspasan datos a Limpieza. */
  function onEdit(e) {
    if (e && e.source) gestionarEdicion(e);
  }
  
  function gestionarEdicion(e) {
    try {
      // Evitar procesar ediciones programáticas (sincronizarEstadoMadre, cascada Técnica, etc.)
      const propEdit = PropertiesService.getScriptProperties().getProperty("edicionProgramatica");
      if (e && propEdit) {
        const t = parseInt(propEdit, 10);
        // Ventana corta para ignorar SOLO las escrituras hechas por el propio script
        // (cambios programáticos suceden en milisegundos; ampliamos margen a 1.5 s)
        if (!isNaN(t) && (new Date().getTime() - t) < 1500) return;
        PropertiesService.getScriptProperties().deleteProperty("edicionProgramatica");
      }
      const ss = e.source;
      const hojaActiva = ss.getActiveSheet();
      const nombreHoja = hojaActiva.getName();
      const rangoEditado = e.range;
      const filaInicio = rangoEditado.getRow();
      const col = rangoEditado.getColumn();
      const numFilas = rangoEditado.getNumRows();
      const ui = SpreadsheetApp.getUi();
  
      // =================================================================
      // 0. BLOQUE DE SEGURIDAD
      // =================================================================
  
      let rawEmail = Session.getActiveUser().getEmail();
      if (!rawEmail && e.user) rawEmail = e.user.getEmail();
      const emailUsuario = String(rawEmail || "").toLowerCase().trim();
  
      let esDuenio = false;
      try {
        const ownerEmail = String(ss.getOwner().getEmail()).toLowerCase().trim();
        if (ownerEmail === emailUsuario && emailUsuario !== "") esDuenio = true;
      } catch (err) { }
  
      const listaTecnica = EQUIPO_TECNICA.map(m => m.toLowerCase().trim());
      const listaTaller = EQUIPO_TALLER.map(m => m.toLowerCase().trim());
      const listaAdmins = ADMINS_TOTALES.map(m => m.toLowerCase().trim());
  
      const esAdmin = esDuenio || listaAdmins.includes(emailUsuario);
  
      if (!esAdmin) {
        let tienePermiso = true;
        //if (emailUsuario === "") {
        //  if (nombreHoja === 'Técnica') tienePermiso = true;
        //  if (nombreHoja === 'Fabricación') tienePermiso = true;
        //  else tienePermiso = false;
        //} else {
        //  if (nombreHoja === 'Técnica') {
        //if (listaTecnica.includes(emailUsuario)) 
        //    tienePermiso = true;
        //  } else if (['Fabricación', 'Remate', 'Limpieza'].includes(nombreHoja)) {
        //if (listaTaller.includes(emailUsuario)) 
        //    tienePermiso = true;
        //  } else {
        //    tienePermiso = false;
        //  }
        //}
  
        if (!tienePermiso) {
          if (e.oldValue !== undefined) e.range.setValue(e.oldValue);
          else e.range.setValue("");
          SpreadsheetApp.flush();
          ui.alert(" ⛔  SEGURIDAD", "DENEGADO: Sin permisos en '" + nombreHoja + "'", ui.ButtonSet.OK);
          return;
        }
      }
  
      // --- BLOQUE POLICÍA ---
      let colsProhibidas = [];
      if (nombreHoja === 'Fabricación') colsProhibidas = [1, 2, 3, 4, 5, 6, 9, 10, 11, 14, 17];
      else if (nombreHoja === 'Técnica') colsProhibidas = [2, 3, 4, 5, 6, 8, 9, 12];
  
      if (colsProhibidas.includes(col) && filaInicio > 1) {
        if (e.oldValue !== undefined) e.range.setValue(e.oldValue);
        else e.range.setValue("");
        ui.alert(" ⛔  SISTEMA ESCARMETAL", "CAMPO PROTEGIDO: El historial está cerrado para edición manual.", ui.ButtonSet.OK);
        return;
      }
  
      // =================================================================
      // --- LÓGICA DE NEGOCIO ---
      // =================================================================
  
      let valoresEditados = [];
      if (numFilas === 1) {
        let val = e.value;
        if (val === undefined) val = rangoEditado.getValue();
        valoresEditados.push([val]);
      } else {
        valoresEditados = rangoEditado.getValues();
      }
  
      const ahora = new Date();
      let flagRecalculoGlobal = false;
  
      // VARIABLES DE MEMORIA Y CONTROL DE BLOQUE
      let memoriaQCFab = null;      // Firma QC solo para hoja Fabricación
      let memoriaQCRemate = null;   // Firma QC solo para hoja Remate
      let memoriaOperarios = null;
      let memoriaEncargado = null;
      let escrituraBloqueRealizada = false;
      let escrituraBloqueRemateRealizada = false;
      let escrituraBloqueLimpiezaRealizada = false;
      let traspasoTecnicaHechoEnEstaEdicion = false;
  
      // >>> HELPER: QC FABRICACIÓN (ALAN, LUIS) <<<
      const FIRMA_QC_FAB_KEY = "firmaQCFabUltima";
      const FIRMA_QC_WINDOW_MS = 6000;
      const solicitarFirmaQCFabricacion = (titulo) => {
        const lock = LockService.getScriptLock();
        if (!lock.tryLock(4000)) return null;
        try {
          const props = PropertiesService.getScriptProperties();
          const t = parseInt(props.getProperty(FIRMA_QC_FAB_KEY) || "0", 10);
          if (t && (Date.now() - t) < FIRMA_QC_WINDOW_MS) return null;
          props.setProperty(FIRMA_QC_FAB_KEY, String(Date.now()));
  
          const msg = "Seleccione Encargado de Calidad - FABRICACIÓN (OBLIGATORIO):\n\n" +
            "1 - ALAN GONZALEZ\n" +
            "2 - FRANCISCO SAN MARTIN\n" +
            "3 - LUIS ULLOA\n" +
            "4 - VICTOR LEIVA\n\n" +
            "Ingrese SOLO el número";
          const resp = ui.prompt(titulo, msg, ui.ButtonSet.OK_CANCEL);
          if (resp.getSelectedButton() == ui.Button.OK) {
            let txt = resp.getResponseText().trim();
            if (txt === "1") return "ALAN GONZALEZ";
            if (txt === "2") return "FRANCISCO SAN MARTIN";
            if (txt === "3") return "LUIS ULLOA";
            if (txt === "4") return "VICTOR LEIVA";
  
            ui.alert(" ⛔  ERROR DE SELECCIÓN", "Entrada no válida.\nSolo se permite '1', '2', '3' o '4'.\nOperación cancelada.", ui.ButtonSet.OK);
            return null;
          }
          return null;
        } finally {
          try { lock.releaseLock(); } catch (e) { }
        }
      };
  
      // >>> HELPER: QC REMATE (Francisco San Martín, Luis Ulloa, Victor Leiva) <<<
      const FIRMA_QC_REMATE_KEY = "firmaQCRemateUltima";
      const solicitarFirmaQCRemate = (titulo) => {
        const lock = LockService.getScriptLock();
        if (!lock.tryLock(4000)) return null;
        try {
          const props = PropertiesService.getScriptProperties();
          const t = parseInt(props.getProperty(FIRMA_QC_REMATE_KEY) || "0", 10);
          if (t && (Date.now() - t) < FIRMA_QC_WINDOW_MS) return null;
          props.setProperty(FIRMA_QC_REMATE_KEY, String(Date.now()));
  
          const msg = "Seleccione Encargado de Calidad - REMATE (OBLIGATORIO):\n\n" +
            "1 - ALAN GONZALEZ\n" +
            "2 - FRANCISCO SAN MARTÍN\n" +
            "3 - LUIS ULLOA\n" +
            "4 - VICTOR LEIVA\n\n" +
            "Ingrese SOLO el número";
          const resp = ui.prompt(titulo, msg, ui.ButtonSet.OK_CANCEL);
          if (resp.getSelectedButton() == ui.Button.OK) {
            let txt = resp.getResponseText().trim();
            if (txt === "1") return "ALAN GONZALEZ";
            if (txt === "2") return "FRANCISCO SAN MARTÍN";
            if (txt === "3") return "LUIS ULLOA";
            if (txt === "4") return "VICTOR LEIVA";
  
            ui.alert(" ⛔  ERROR DE SELECCIÓN", "Entrada no válida.\nSolo se permite '1', '2', '3' O '4'.\nOperación cancelada.", ui.ButtonSet.OK);
            return null;
          }
          return null;
        } finally {
          try { lock.releaseLock(); } catch (e) { }
        }
      };
  
      // >>> HELPER: SELECCIÓN TÉCNICA ESTRICTA (una sola vez por ventana de tiempo) <<<
      const FIRMA_TECNICA_KEY = "firmaTecnicaUltima";
      const FIRMA_TECNICA_WINDOW_MS = 6000;
      const solicitarFirmaTecnica = (titulo) => {
        const lock = LockService.getScriptLock();
        if (!lock.tryLock(4000)) return null; // Otra ejecución está pidiendo firma
        try {
          const props = PropertiesService.getScriptProperties();
          const t = parseInt(props.getProperty(FIRMA_TECNICA_KEY) || "0", 10);
          if (t && (Date.now() - t) < FIRMA_TECNICA_WINDOW_MS) return null;
          props.setProperty(FIRMA_TECNICA_KEY, String(Date.now()));
  
          const msg = "Seleccione Encargado Técnica (OBLIGATORIO):\n\n" +
            "1 - EDUARDO ARIAS\n" +
            "2 - ROBERTO ACEVEDO\n" +
            "3 - RENATO OÑATE\n\n" +
            "Ingrese SOLO el número (1, 2 o 3).";
          const resp = ui.prompt(titulo, msg, ui.ButtonSet.OK_CANCEL);
          if (resp.getSelectedButton() == ui.Button.OK) {
            let txt = resp.getResponseText().trim();
            if (txt === "1") return "EDUARDO ARIAS";
            if (txt === "2") return "ROBERTO ACEVEDO";
            if (txt === "3") return "RENATO OÑATE";
  
            ui.alert(" ⛔  ERROR DE SELECCIÓN", "Entrada no válida.\nSolo se permite '1', '2' o '3'.\nOperación cancelada.", ui.ButtonSet.OK);
            return null;
          }
          return null;
        } finally {
          try { lock.releaseLock(); } catch (e) { }
        }
      };
  
  
      for (let i = 0; i < numFilas; i++) {
        const filaActual = filaInicio + i;
        if (filaActual < 2) continue;
  
        const rawVal = valoresEditados[i][0];
        const valor = String(rawVal).trim().toUpperCase();
        // Se activa solo cuando se confirma ENTREGADO en madre de Fabricación.
        let cierreTotalDesdeMadreFab = false;
  
        // 1. INGRESO TÉCNICA (MOMENTO DE IMPRESIÓN - SE PIDE FIRMA AQUÍ)
        // Solo si es edición de UNA celda (A2) con un código de planificación (nunca al cambiar estado a ENTREGADO)
        const numCols = rangoEditado.getNumColumns();
        const valorEsEstado = ["ENTREGADO", "IMPRESO"].includes(valor);
        if (nombreHoja === 'Técnica' && col === 1 && filaActual === 2 && valor !== "" && !valorEsEstado && numFilas === 1 && numCols === 1) {
          const ultimaFila = Math.max(hojaActiva.getLastRow(), 3);
          const datosExistentes = hojaActiva.getRange(3, 1, ultimaFila - 2, 1).getValues().flat();
          const yaExiste = datosExistentes.some(codigo => String(codigo).trim().toUpperCase() === valor);
  
          if (yaExiste) {
            ui.alert(" ⚠️  DUPLICADO", "La planificación (" + valor + ") ya fue impresa anteriormente.", ui.ButtonSet.OK);
            hojaActiva.getRange("A2").clearContent();
            return;
          }
  
          // Una sola ejecución puede insertar filas (evitar doble bloque madre+hijos)
          const lockIngreso = LockService.getScriptLock();
          if (!lockIngreso.tryLock(5000)) {
            return; // Otra ejecución está procesando; no agregar filas
          }
          try {
            // Revisar de nuevo por si la otra ejecución ya insertó
            const ultimaFila2 = Math.max(hojaActiva.getLastRow(), 3);
            const datosExistentes2 = hojaActiva.getRange(3, 1, ultimaFila2 - 2, 1).getValues().flat();
            if (datosExistentes2.some(codigo => String(codigo).trim().toUpperCase() === valor)) {
              hojaActiva.getRange("A2").clearContent();
              return;
            }
  
            let firmaInicio = solicitarFirmaTecnica("🖨️ IMPRESIÓN - ASIGNAR RESPONSABLE");
            if (!firmaInicio) {
              hojaActiva.getRange("A2").clearContent();
              return;
            }
  
            procesarIngresoTecnicaTop(hojaActiva, valor, ahora, ss, firmaInicio);
            hojaActiva.getRange("A2").clearContent();
            hojaActiva.getRange("A2").activate();
          } finally {
            try { lockIngreso.releaseLock(); } catch (err) { }
          }
          return;
        }
  
        // 2. Control de Estados
        let colEstado = 7;
        if (nombreHoja === 'Remate') colEstado = 7; // En Remate el estado está en la columna 7 (igual que Fabricación)
  
        if (col === colEstado && filaActual > 1) {
  
          // >>>>> ENTREGA CON OBSERVACIÓN (Siempre individual) <<<<<
          // Se procesa dentro del flujo de ENTREGADO (mismo traspaso/tiempos),
          // pero registrando el evento en Log_Calidad y preguntando tiempo perdido.
          const esEntregaConObservacionFab = (nombreHoja === 'Fabricación' && valor === "ENTREGA CON OBSERVACION");
  
          // >>>>> CONFIRMACIÓN MASIVA <<<<<
          let aplicarCascada = false;
          if (nombreHoja === 'Fabricación' && (valor === "FABRICANDO" || valor === "ENTREGADO")) {
            const colorFila = hojaActiva.getRange(filaActual, 1).getFontColor();
            const esMadre = (colorFila !== '#999999');
  
            if (esMadre) {
              // FABRICANDO en madre: no mostrar advertencia; aplicar cascada automáticamente (solo se pide encargado)
              if (valor === "FABRICANDO") {
                aplicarCascada = true;
              } else if (valor === "ENTREGADO") {
                // ENTREGADO en madre: confirmar ANTES de cualquier otro modal (ej. QC)
                // y evitar duplicado de alerta por doble disparo del onEdit.
                const CONFIRM_KEY = "confirmacionMasivaUltima";
                const CONFIRM_WINDOW_MS = 6000;
                const lockConf = LockService.getScriptLock();
                // Si no podemos tomar lock y hay confirmación reciente, es un onEdit duplicado:
                // abortar este disparo para que no llegue al modal de QC mientras otro flujo confirma.
                if (!lockConf.tryLock(4000)) {
                  const t = parseInt(PropertiesService.getScriptProperties().getProperty(CONFIRM_KEY) || "0", 10);
                  if (t && (Date.now() - t) < CONFIRM_WINDOW_MS) {
                    continue;
                  }
                }
                try {
                  const props = PropertiesService.getScriptProperties();
                  const t = parseInt(props.getProperty(CONFIRM_KEY) || "0", 10);
                  // Confirmación reciente dentro de ventana: tratar como reentrada y no continuar.
                  if (t && (Date.now() - t) < CONFIRM_WINDOW_MS) {
                    continue;
                  }
                  props.setProperty(CONFIRM_KEY, String(Date.now()));
                  const resp = ui.prompt(
                    " 📦  ENTREGA DE CONJUNTO",
                    "Estás marcando el CONJUNTO PRINCIPAL como 'ENTREGADO'.\n\n" +
                    "1 - Entregar TODO (madre + todos los hijos)\n" +
                    "2 - Entregar SOLO ALGUNOS hijos\n\n" +
                    "Ingrese 1 o 2.",
                    ui.ButtonSet.OK_CANCEL
                  );
                  if (!resp || resp.getSelectedButton() !== ui.Button.OK) {
                    PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(new Date().getTime()));
                    hojaActiva.getRange(filaActual, col).setValue(e.oldValue || "FABRICANDO");
                    return;
                  }
                  const opcion = String(resp.getResponseText() || "").trim();
                  if (opcion === "1") {
                    aplicarCascada = true;
                    cierreTotalDesdeMadreFab = true;
                  } else if (opcion === "2") {
                    // Entrega selectiva: devolvemos la madre a FABRICANDO y abrimos selector de hijos.
                    PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(new Date().getTime()));
                    hojaActiva.getRange(filaActual, col).setValue(e.oldValue || "FABRICANDO");
                    SpreadsheetApp.flush();
                    try {
                      // Guardar pendiente y continuar por menú (fuera de onEdit) para evitar timeout.
                      dejarEntregaSelectivaPendiente_(ss.getId(), hojaActiva.getName(), filaActual);
                      ss.toast("Entrega selectiva pendiente. Use menú: 🛠️ GESTIÓN PRODUCCIÓN → ▶️ Continuar Entrega Selectiva", "ESCARMETAL", 8);
                    } catch (eSel) {
                      try {
                        ss.toast("ERROR ENTREGA SELECTIVA: " + String(eSel && eSel.message ? eSel.message : eSel), "ESCARMETAL", 10);
                      } catch (e2) { }
                    }
                    return;
                  } else {
                    ui.alert(" ⛔  ERROR", "Opción inválida. Operación cancelada.", ui.ButtonSet.OK);
                    PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(new Date().getTime()));
                    hojaActiva.getRange(filaActual, col).setValue(e.oldValue || "FABRICANDO");
                    return;
                  }
                } finally {
                  try { lockConf.releaseLock(); } catch (e) { }
                }
              }
            }
          }
  
          // --- LÓGICA NORMAL FABRICACION ---
          if (nombreHoja === 'Fabricación') {
            // 1. NUEVA LÓGICA ENTREGA PARCIAL
            if (valor === "ENTREGA PARCIAL") {
              // Evitar alertas dobles (onEdit reentrante o doble disparo del drop-down)
              const propsEP = PropertiesService.getScriptProperties();
              const EP_ERR_KEY = "entregaParcialErrorUltimo";
              const EP_ERR_WINDOW_MS = 800;
              const alertaYaMostrada = () => {
                const t = parseInt(propsEP.getProperty(EP_ERR_KEY) || "0", 10);
                return !isNaN(t) && (Date.now() - t) < EP_ERR_WINDOW_MS;
              };
              const recordarAlerta = () => propsEP.setProperty(EP_ERR_KEY, String(Date.now()));
  
              const cantTotal = parseInt(hojaActiva.getRange(filaActual, 3).getValue()) || 0;
              const pesoUnit = parseFloat(hojaActiva.getRange(filaActual, 4).getValue()) || 0;
  
              if (cantTotal <= 1) {
                PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(new Date().getTime()));
                if (!alertaYaMostrada()) {
                  recordarAlerta();
                  ui.alert(" ⚠️  ERROR", "No se puede dividir una cantidad de 1.\nUse ENTREGADO normal.", ui.ButtonSet.OK);
                }
                hojaActiva.getRange(filaActual, col).setValue(e.oldValue || "FABRICANDO");
                return;
              }
  
              // Una sola ejecución puede mostrar el prompt (evitar doble diálogo)
              const ENTREGA_PARCIAL_KEY = "entregaParcialSolicitudUltima";
              const ENTREGA_PARCIAL_WINDOW_MS = 6000;
              const lockEntrega = LockService.getScriptLock();
              if (!lockEntrega.tryLock(4000)) {
                const t = parseInt(PropertiesService.getScriptProperties().getProperty(ENTREGA_PARCIAL_KEY) || "0", 10);
                if (t && (Date.now() - t) < ENTREGA_PARCIAL_WINDOW_MS) return; // Otra ejecución ya pidió cantidad
              }
              let respCant = null;
              try {
                const props = PropertiesService.getScriptProperties();
                const t = parseInt(props.getProperty(ENTREGA_PARCIAL_KEY) || "0", 10);
                if (t && (Date.now() - t) < ENTREGA_PARCIAL_WINDOW_MS) return;
                props.setProperty(ENTREGA_PARCIAL_KEY, String(Date.now()));
  
                respCant = ui.prompt(" 📦  ENTREGA PARCIAL",
                  "Cantidad TOTAL del conjunto: " + cantTotal + "\n\n¿Cuántas unidades se entregan hoy?",
                  ui.ButtonSet.OK_CANCEL);
              } finally {
                try { lockEntrega.releaseLock(); } catch (e) { }
              }
  
              if (!respCant) {
                PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(new Date().getTime()));
                hojaActiva.getRange(filaActual, col).setValue(e.oldValue || "FABRICANDO");
                return;
              }
  
              if (respCant.getSelectedButton() == ui.Button.OK) {
                const cantEntregada = parseInt(respCant.getResponseText());
  
                if (isNaN(cantEntregada) || cantEntregada <= 0 || cantEntregada >= cantTotal) {
                  PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(new Date().getTime()));
                  if (!alertaYaMostrada()) {
                    recordarAlerta();
                    ui.alert(" ⛔  ERROR", "Cantidad inválida. Debe ser menor al total (" + cantTotal + ") y mayor a 0.", ui.ButtonSet.OK);
                  }
                  hojaActiva.getRange(filaActual, col).setValue(e.oldValue || "FABRICANDO");
                  return;
                }
  
                // Pedir Firma QC para la parte que se entrega
                let firmaParcial = solicitarFirmaQCFabricacion("✅ CALIDAD - ENTREGA PARCIAL");
                if (!firmaParcial) {
                  hojaActiva.getRange(filaActual, col).setValue(e.oldValue || "FABRICANDO");
                  return;
                }
  
                const cantRestante = cantTotal - cantEntregada;
  
                // Marcar edición programática ANTES de hacer cambios para evitar que se dispare otra solicitud de firma
                PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(new Date().getTime()));
  
                // A. ACTUALIZAR FILA ORIGINAL (PENDIENTE)
                hojaActiva.getRange(filaActual, 3).setValue(cantRestante);
                hojaActiva.getRange(filaActual, 5).setValue(cantRestante * pesoUnit);
                hojaActiva.getRange(filaActual, 7).setValue("FABRICANDO"); // Vuelve a estado activo
  
                // B. INSERTAR NUEVA FILA (PARCIAL YA ENTREGADA)
                hojaActiva.insertRowAfter(filaActual);
                const filaNueva = filaActual + 1;
                // Copiar datos de la fila original
                const datosFila = hojaActiva.getRange(filaActual, 1, 1, 18).getValues()[0];
  
                // Modificar datos para la fila parcial que SE ENTREGA AHORA
                datosFila[2] = cantEntregada;             // Cantidad parcial entregada
                datosFila[4] = cantEntregada * pesoUnit;  // Peso total parcial
                // Estado inicial de la nueva fila: PARCIAL (luego el usuario podrá cambiarla a ENTREGADO)
                datosFila[6] = "PARCIAL";
                // Mantener fecha de inicio (col 9, índice 8) heredada de la fila original
                datosFila[9] = ahora;                     // Fecha fin de la entrega parcial (col 10, índice 9)
                datosFila[11] = firmaParcial;             // Operario / QC visible en columna L (col 12)
                datosFila[14] = firmaParcial;             // QC en columna O (col 15) para coherencia con otras rutinas
                datosFila[16] = "";                       // Limpiar cálculo de tiempo; se recalculará a continuación
  
                // Pegar en la nueva fila (filaActual + 1)
                hojaActiva.getRange(filaNueva, 1, 1, 18).setValues([datosFila]);
  
                // Marcar la fila entregada como "hijo" (gris) para que el Dashboard la sume y traspaso a Remate la incluya
                hojaActiva.getRange(filaNueva, 1).setFontColor("#999999");
  
                SpreadsheetApp.flush();
  
                // La nueva fila queda en estado PARCIAL; el flujo completo de ENTREGADO
                // (QC final, traspaso, dashboard, etc.) se ejecutará cuando el usuario
                // cambie manualmente el estado de esta fila a ENTREGADO.
                // Aun así refrescamos Dashboard para actualizar la hora de última edición de Fabricación.
                try { recalcularTotalDelDia(); } catch (eDashParcial) { }
                return;
  
              } else {
                hojaActiva.getRange(filaActual, col).setValue(e.oldValue || "FABRICANDO");
                return;
              }
            }
  
            if (valor === "FABRICANDO" || valor === "REPARACION") {
              // Marcar edición programática para que cascadaEstadoMasivo no dispare otra solicitud de operarios
              PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(new Date().getTime()));
              let valResponsable = hojaActiva.getRange(filaActual, 11).getValue();
              if (String(valResponsable).trim() === "") {
                if (memoriaOperarios) {
                  hojaActiva.getRange(filaActual, 11).setValue(memoriaOperarios);
                  valResponsable = memoriaOperarios;
                } else {
                  // Una sola ejecución puede mostrar el prompt (evitar doble diálogo)
                  const OPERARIOS_KEY = "operariosSolicitudUltima";
                  const OPERARIOS_WINDOW_MS = 6000;
                  const lockOp = LockService.getScriptLock();
                  if (!lockOp.tryLock(4000)) {
                    const t = parseInt(PropertiesService.getScriptProperties().getProperty(OPERARIOS_KEY) || "0", 10);
                    if (t && (Date.now() - t) < OPERARIOS_WINDOW_MS) return; // Otra ejecución ya pidió operarios
                  }
                  try {
                    const props = PropertiesService.getScriptProperties();
                    const t = parseInt(props.getProperty(OPERARIOS_KEY) || "0", 10);
                    if (t && (Date.now() - t) < OPERARIOS_WINDOW_MS) return;
                    props.setProperty(OPERARIOS_KEY, String(Date.now()));
  
                    // Versión original: se ingresa a mano el/los nombres de quienes fabrican
                    let respOp = ui.prompt(" 👷  FALTAN OPERARIOS", "Para iniciar FABRICACIÓN, asigne responsables.\nIngrese Nombres:", ui.ButtonSet.OK_CANCEL);
                    if (respOp.getSelectedButton() == ui.Button.OK && respOp.getResponseText().trim() !== "") {
                      memoriaOperarios = respOp.getResponseText().trim().toUpperCase();
                      hojaActiva.getRange(filaActual, 11).setValue(memoriaOperarios);
                      valResponsable = memoriaOperarios;
                    } else {
                      ui.alert(" ❌  CANCELADO", "Debe asignar operarios. Se restaura el estado anterior.", ui.ButtonSet.OK);
                      hojaActiva.getRange(filaActual, col).setValue(e.oldValue || "");
                      continue;
                    }
                  } finally {
                    try { lockOp.releaseLock(); } catch (e) { }
                  }
                }
              }
              if (hojaActiva.getRange(filaActual, 9).getValue() === "") {
                hojaActiva.getRange(filaActual, 9).setValue(ahora);
              }
  
              if (aplicarCascada && valor === "FABRICANDO") {
                cascadaEstadoMasivo(hojaActiva, filaActual, ahora, "FABRICANDO", valResponsable, null);
              }
            }
          }
  
          // --- ENTREGADO ---
          if (valor === "ENTREGADO" || esEntregaConObservacionFab) {
            // Marcar desde el inicio para que cualquier setValue en cascada/sincronizar no dispare otra solicitud de firma
            PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(new Date().getTime()));
  
            // Si ya hay un traspaso Técnica->Fabricación en curso, en vez de bloquear al usuario:
            // guardamos la planificación en una cola para procesarla luego, uno por uno.
            let skipTraspasoTecnica = false;
          let operarioFabEntregaTecnica = "";
  
            // Bloqueo suave: impedir que se dispare otro ENTREGADO en Técnica mientras
            // sigue en curso el traspaso a Fabricación (usuarios presionan muy rápido).
            // Guardamos también el código para no revertir cuando es el mismo conjunto,
            // caso en el que el traspaso principal ya puede haberse ejecutado.
            const propsTraspasoTec = PropertiesService.getScriptProperties();
            const KEY_TRASPASO_TEC = "traspasoTecnicaEnCurso";
            const MAX_TRASPASO_MS = 10000; // 10s de ventana de espera
            const rawTraspaso = String(propsTraspasoTec.getProperty(KEY_TRASPASO_TEC) || "");
            const partsTraspaso = rawTraspaso.split("|");
            const tsTraspaso = parseInt(partsTraspaso[0] || "0", 10);
            const codigoEnCurso = String(partsTraspaso[1] || "").trim().toUpperCase();
            const codigoFilaActual = String(hojaActiva.getRange(filaActual, 1).getValue() || "").trim().toUpperCase();
            if (!isNaN(tsTraspaso) && (Date.now() - tsTraspaso) < MAX_TRASPASO_MS && nombreHoja === 'Técnica') {
              // Si el bloqueo corresponde al mismo código, no revertir estado:
              // el traspaso principal ya está en ejecución/terminó y este disparo es redundante.
              if (codigoEnCurso && codigoFilaActual === codigoEnCurso) {
                continue;
              }
              // Distinto código: lo dejamos como ENTREGADO en Técnica y lo encolamos para traspasar después.
              if (codigoFilaActual) {
                encolarTraspasoTecnicaPendiente(codigoFilaActual);
                skipTraspasoTecnica = true;
              }
            }
            let traspasoTecTomado = false;
  
            // CASO 1: TÉCNICA
            if (nombreHoja === 'Técnica') {
              // Si es un doble disparo/reentrada y ya estaba ENTREGADO, no volver a pedir operario ni traspasar.
              const oldEstTec = (e && typeof e.oldValue === "string") ? String(e.oldValue).trim().toUpperCase() : "";
              if (oldEstTec === "ENTREGADO") {
                continue;
              }
              if (String(hojaActiva.getRange(filaActual, 10).getValue()).trim() === "") {
                if (memoriaEncargado) {
                  hojaActiva.getRange(filaActual, 10).setValue(memoriaEncargado);
                } else {
                  let firmaObtenida = solicitarFirmaTecnica("📝 ENTREGA TÉCNICA - FALTA FIRMA");
                  if (firmaObtenida && firmaObtenida !== "") {
                    memoriaEncargado = firmaObtenida;
                    hojaActiva.getRange(filaActual, 10).setValue(memoriaEncargado);
                  } else {
                    hojaActiva.getRange(filaActual, col).setValue(e.oldValue || "");
                    continue;
                  }
                }
              }
            // Nuevo flujo: SIEMPRE pedir operario de fabricación al entregar en Técnica.
            // No usar ni sobrescribir la columna K de Técnica para este dato.
            // Anti-duplicado robusto: el operario se pide UNA sola vez por CONJUNTO (código madre).
            // Si otro disparo llega tarde (p.ej. quedó esperando locks), reutiliza el operario guardado y NO muestra modal.
            const propsTecOp = PropertiesService.getScriptProperties();
            const CACHE_PREFIX = "entregaTecnicaOperarioCacheV2:"; // nueva clave para evitar cruces con versiones anteriores
            const CACHE_MS = 10 * 60 * 1000; // 10 min: absorbe dobles disparos tardíos
            // Resolver código madre (si se entregó un hijo)
            let filaMadreTec = filaActual;
            try {
              while (filaMadreTec > 1 && hojaActiva.getRange(filaMadreTec, 1).getFontColor() === "#999999") filaMadreTec--;
            } catch (eUpTec) { }
            const codigoKey = String(hojaActiva.getRange(filaMadreTec, 1).getValue() || "").trim().toUpperCase();
            const cacheKey = CACHE_PREFIX + String(ss.getId()) + ":" + codigoKey;
            const lockTecOp = LockService.getScriptLock();
  
            const leerOperarioPorCodigo = () => {
              if (!codigoKey) return "";
              const raw = String(propsTecOp.getProperty(cacheKey) || "");
              const p = raw.split("|");
              const tsPrev = parseInt(p[0] || "0", 10);
              const opPrev = p.slice(1).join("|");
              if (!isNaN(tsPrev) && (Date.now() - tsPrev) < CACHE_MS && String(opPrev).trim() !== "") {
                return String(opPrev).trim().toUpperCase();
              }
              return "";
            };
  
            // Si ya está cacheado (por un disparo anterior inmediato), no preguntar.
            const opPreCache = leerOperarioPorCodigo();
            if (opPreCache) {
              operarioFabEntregaTecnica = opPreCache;
            } else {
              // Serializar el modal para que el segundo disparo espere y luego lea el cache.
              try {
                lockTecOp.waitLock(30000);
              } catch (eLockOp) {
                // Si no se pudo tomar lock, al menos intentar leer cache nuevamente; si no existe, evitar duplicar modal.
                const opCache2 = leerOperarioPorCodigo();
                if (opCache2) {
                  operarioFabEntregaTecnica = opCache2;
                } else {
                  continue;
                }
              }
              try {
                const opCache = leerOperarioPorCodigo();
                if (opCache) {
                  operarioFabEntregaTecnica = opCache;
                } else {
                  const respOp = ui.prompt(" 👷  OPERARIO DE FABRICACIÓN", "Indique quién estará a cargo de la fabricación:", ui.ButtonSet.OK_CANCEL);
                  if (respOp.getSelectedButton() == ui.Button.OK && respOp.getResponseText().trim() !== "") {
                    operarioFabEntregaTecnica = respOp.getResponseText().trim().toUpperCase();
                    if (codigoKey) propsTecOp.setProperty(cacheKey, String(Date.now()) + "|" + operarioFabEntregaTecnica);
                  } else {
                    hojaActiva.getRange(filaActual, col).setValue(e.oldValue || "");
                    continue;
                  }
                }
              } finally {
                try { lockTecOp.releaseLock(); } catch (eRelTOp) { }
              }
            }
            }
  
            // CASO 2: FABRICACIÓN
            if (nombreHoja === 'Fabricación') {
              // Variante: ENTREGA CON OBSERVACION (sin dejar pieza en reparación; se entrega y se loguea)
              if (esEntregaConObservacionFab) {
                if (numFilas !== 1) {
                  ui.alert(" ⛔  ERROR", "ENTREGA CON OBSERVACION debe registrarse de forma individual (una pieza a la vez).", ui.ButtonSet.OK);
                  PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
                  hojaActiva.getRange(filaActual, col).setValue(e && e.oldValue ? e.oldValue : "FABRICANDO");
                  return;
                }
  
                // Asegurar QC (misma lógica de firma utilizada por rechazo / entrega)
                const qcResponsable = hojaActiva.getRange(filaActual, 12).getValue();
                if (String(qcResponsable).trim() === "") {
                  if (memoriaQCFab) {
                    hojaActiva.getRange(filaActual, 12).setValue(memoriaQCFab);
                  } else {
                    const firmaObtenida = solicitarFirmaQCFabricacion("✅ ENTREGA CON OBSERVACION - FIRMA QC");
                    if (firmaObtenida && firmaObtenida !== "") {
                      memoriaQCFab = firmaObtenida;
                      hojaActiva.getRange(filaActual, 12).setValue(memoriaQCFab);
                    } else {
                      // Cancelado: restaurar estado previo
                      PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
                      hojaActiva.getRange(filaActual, col).setValue(e && e.oldValue ? e.oldValue : "FABRICANDO");
                      hojaActiva.getRange(filaActual, 12).setValue("");
                      return;
                    }
                  }
                }
  
                // Motivo / detalle (mismos prompts que rechazo) + tiempo perdido
                const promptMsg = "MOTIVO DE LA OBSERVACIÓN:\n\n1 - MEDIDAS\n2 - SOLDADURA\n3 - ARMADO\n4 - MATERIAL\n5 - TERMINACIÓN\n6 - OTRO\n\nIngrese el NÚMERO del error:";
                const respuesta = ui.prompt(" ⚠️  ENTREGA CON OBSERVACION (1/3)", promptMsg, ui.ButtonSet.OK_CANCEL);
                if (!respuesta || respuesta.getSelectedButton() !== ui.Button.OK) {
                  PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
                  hojaActiva.getRange(filaActual, col).setValue(e && e.oldValue ? e.oldValue : "FABRICANDO");
                  return;
                }
                const codigoError = String(respuesta.getResponseText()).trim();
                const descError = TIPOS_ERROR[codigoError] || "NO ESPECIFICADO / OTRO";
  
                const respuestaObs = ui.prompt(" 📝  DETALLES (2/3)", "Ingrese observación específica (Ej: Poros en unión):", ui.ButtonSet.OK_CANCEL);
                if (!respuestaObs || respuestaObs.getSelectedButton() !== ui.Button.OK) {
                  PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
                  hojaActiva.getRange(filaActual, col).setValue(e && e.oldValue ? e.oldValue : "FABRICANDO");
                  return;
                }
                let observacionTexto = String(respuestaObs.getResponseText() || "").trim();
                if (!observacionTexto) observacionTexto = "-";
  
                const respTiempo = ui.prompt(
                  " ⏱️  TIEMPO PERDIDO (3/3)",
                  "¿Cuánto tiempo aproximado perdió el obrero por esta observación/rechazo?\n\n" +
                  "Ingrese un valor (ej: 30 min, 1h, 1.5h).",
                  ui.ButtonSet.OK_CANCEL
                );
                if (!respTiempo || respTiempo.getSelectedButton() !== ui.Button.OK) {
                  PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
                  hojaActiva.getRange(filaActual, col).setValue(e && e.oldValue ? e.oldValue : "FABRICANDO");
                  return;
                }
                let tiempoPerdido = String(respTiempo.getResponseText() || "").trim();
                if (!tiempoPerdido) tiempoPerdido = "-";
  
                // Registrar en log (incluye tipo MADRE/HIJO)
                const qcFinal = hojaActiva.getRange(filaActual, 12).getValue();
                const colorFilaObs = hojaActiva.getRange(filaActual, 1).getFontColor();
                const esHijoObs = (colorFilaObs === "#999999");
                const tipoAgrupacion = esHijoObs ? "HIJO" : "MADRE";
                registrarEntregaConObservacionEnLog(ss, hojaActiva, filaActual, ahora, descError, qcFinal, observacionTexto, tiempoPerdido, tipoAgrupacion);
  
                // Guardar detalle visible en la fila (col 13), sin cambiar el flujo de entrega
                try {
                  hojaActiva.getRange(filaActual, 13).setValue("Obs: " + observacionTexto + " | Tiempo perdido: " + tiempoPerdido);
                } catch (eObs) { }
                // Dashboard: fecha fin + recálculo inmediato (ENTREGA CON OBSERVACION cuenta como entrega del día)
                try {
                  if (String(hojaActiva.getRange(filaActual, 10).getValue() || "").trim() === "") {
                    hojaActiva.getRange(filaActual, 10).setValue(ahora).setNumberFormat("hh:mmam/pm dd/MM/yy");
                  }
                  SpreadsheetApp.flush();
                  recalcularTotalDelDia(filaActual);
                } catch (eDashObs) { }
              }
  
              const colorFilaActual = hojaActiva.getRange(filaActual, 1).getFontColor();
              const esHijo = (colorFilaActual === "#999999");
  
              // ENTREGA SELECTIVA (desde un HIJO): al marcar ENTREGADO, permitir seleccionar varios hijos
              if (numFilas === 1 && esHijo) {
                const oldEst = (e && typeof e.oldValue === "string") ? String(e.oldValue).trim().toUpperCase() : "";
                // Solo preguntar cuando el usuario efectivamente está entregando (no reentradas)
                if (oldEst !== "ENTREGADO") {
                  // Anti-duplicado: onEdit puede dispararse dos veces (validación, doble evento) y mostraba el modal dos veces.
                  const ENTREGA_HIJO_TIPO_KEY = "entregaHijoFabricTipoModalUltima";
                  const ENTREGA_HIJO_TIPO_MS = 6000;
                  const propsHijoTipo = PropertiesService.getScriptProperties();
                  const firmaEventoHijo = String(ss.getId()) + "|" + nombreHoja + "|" + filaActual + "|" + col + "|ENTREGADO_HIJO";
                  const lockHijoTipo = LockService.getScriptLock();
                  const esEventoDuplicado = () => {
                    const raw = propsHijoTipo.getProperty(ENTREGA_HIJO_TIPO_KEY) || "";
                    const p = raw.split("|");
                    const tsPrev = parseInt(p[0] || "0", 10);
                    const sigPrev = p.slice(1).join("|");
                    return !isNaN(tsPrev) && (Date.now() - tsPrev) < ENTREGA_HIJO_TIPO_MS && sigPrev === firmaEventoHijo;
                  };
                  if (!lockHijoTipo.tryLock(4000)) {
                    // Otra ejecución está mostrando el mismo modal o acaba de registrar el evento: no duplicar.
                    if (esEventoDuplicado()) continue;
                    continue;
                  }
                  try {
                    if (esEventoDuplicado()) continue;
                    propsHijoTipo.setProperty(ENTREGA_HIJO_TIPO_KEY, String(Date.now()) + "|" + firmaEventoHijo);
  
                    const respSelTipo = ui.prompt(
                      " 📦  ENTREGA ",
                      "¿Desea entregar solo este conjunto o varios?\n\n" +
                      "1 - Solo este conjunto\n" +
                      "2 - Seleccionar mas conjuntos\n\n" +
                      "Ingrese 1 o 2.",
                      ui.ButtonSet.OK_CANCEL
                    );
                    if (!respSelTipo || respSelTipo.getSelectedButton() !== ui.Button.OK) {
                      PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
                      hojaActiva.getRange(filaActual, col).setValue(e.oldValue || "FABRICANDO");
                      return;
                    }
                    const opt = String(respSelTipo.getResponseText() || "").trim();
                    if (opt === "2") {
                      try {
                        PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
                        hojaActiva.getRange(filaActual, col).setValue(e.oldValue || "FABRICANDO");
                        SpreadsheetApp.flush();
                        // Resolver madre del bloque y dejar pendiente para ejecución por menú.
                        const bloqueSel = _obtenerBloqueHijosFabricacionDesdeFila_(hojaActiva, filaActual);
                        if (!bloqueSel || !bloqueSel.filaMadre) throw new Error("No se pudo detectar la fila madre del bloque.");
                        dejarEntregaSelectivaPendiente_(ss.getId(), hojaActiva.getName(), bloqueSel.filaMadre);
                        ss.toast("Entrega selectiva pendiente. Use menú: 🛠️ GESTIÓN PRODUCCIÓN → ▶️ Continuar Entrega Selectiva", "ESCARMETAL", 8);
                      } catch (errSelH) {
                        try { ss.toast("ERROR entrega selectiva: " + String(errSelH && errSelH.message ? errSelH.message : errSelH), "ESCARMETAL", 10); } catch (e2) { }
                        PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
                        hojaActiva.getRange(filaActual, col).setValue(e.oldValue || "FABRICANDO");
                      }
                      return;
                    }
                    if (opt !== "1") {
                      PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
                      hojaActiva.getRange(filaActual, col).setValue(e.oldValue || "FABRICANDO");
                      return;
                    }
                  } finally {
                    try { lockHijoTipo.releaseLock(); } catch (eRelHT) { }
                  }
                }
              }
  
              // Si es un hijo: validar firma QC PRIMERO antes de avanzar
              if (numFilas === 1 && esHijo) {
                let encargadoHijo = hojaActiva.getRange(filaActual, 12).getValue();
                if (String(encargadoHijo).trim() === "") {
                  if (memoriaQCFab) {
                    encargadoHijo = memoriaQCFab;
                    hojaActiva.getRange(filaActual, 12).setValue(memoriaQCFab);
                  } else {
                    const firmaHijo = solicitarFirmaQCFabricacion("✅ ENTREGA PIEZA - FIRMA QC OBLIGATORIA");
                    if (!firmaHijo || firmaHijo === "") {
                      // Sin firma QC válida, se revierte al estado anterior de la celda
                      if (e.oldValue !== undefined) {
                        hojaActiva.getRange(filaActual, col).setValue(e.oldValue);
                      } else {
                        hojaActiva.getRange(filaActual, col).setValue("");
                      }
                      SpreadsheetApp.flush();
                      return;
                    }
                    memoriaQCFab = firmaHijo;
                    hojaActiva.getRange(filaActual, 12).setValue(firmaHijo);
                  }
                }
              }
  
              const datosFab = hojaActiva.getDataRange().getValues();
              const coloresFab = hojaActiva.getRange(1, 1, datosFab.length, 1).getFontColors();
              let idxMadre = filaActual - 1;
              while (idxMadre >= 0 && coloresFab[idxMadre][0] === "#999999") idxMadre--;
              if (idxMadre < 0) idxMadre = filaActual - 1;
              const filaMadre = idxMadre + 1;
              // Esta validación aplica cuando se entrega un HIJO.
              // Si se edita la madre directamente a ENTREGADO, no debe auto-bloquearse por leer su propio estado ya cambiado.
              if (esHijo) {
                const estadoMadre = hojaActiva.getRange(filaMadre, 7).getValue();
                if (String(estadoMadre).trim() !== "FABRICANDO" && String(estadoMadre).trim() !== "REPARACION") {
                  ui.alert(" ⛔  ERROR FLUJO", "El conjunto principal (madre) debe estar en FABRICANDO antes de entregar.", ui.ButtonSet.OK);
                  hojaActiva.getRange(filaActual, col).setValue(e.oldValue || "");
                  continue;
                }
              }
              // >>> PASO A: ESCRITURA EN BLOQUE INTELIGENTE <<<
              if (numFilas > 1 && !escrituraBloqueRealizada) {
                let encargadoCalidad = hojaActiva.getRange(filaActual, 14).getValue();
  
                if (String(encargadoCalidad).trim() === "") {
                  if (memoriaQCFab) {
                    encargadoCalidad = memoriaQCFab;
                  } else {
                    // MENU ESTRICTO BLOQUE QC
                    let firmaObtenida = solicitarFirmaQCFabricacion("✅ CALIDAD (LOTE) - FIRMA REQUERIDA");
                    if (firmaObtenida && firmaObtenida !== "") {
                      memoriaQCFab = firmaObtenida;
                      encargadoCalidad = memoriaQCFab;
                    } else {
                      // Error o cancelado: mantener estado ENTREGADO pero mostrar advertencia
                      
                      // Asegurar que el estado se mantenga en ENTREGADO
                      hojaActiva.getRange(filaInicio, col, numFilas, 1).setValue("ENTREGADO");
                      SpreadsheetApp.flush();
                      // Aplicar color verde inmediatamente
                      aplicarColoresEstadoFabricacion(hojaActiva, filaInicio, numFilas);
                      continue;
                    }
                  }
                }
  
                // 1. Leer fechas de inicio ANTES de escribir la fecha de fin
                const rangoInicios = hojaActiva.getRange(filaInicio, 9, numFilas, 1).getValues();
                
                // 2. Estampamos QC y FECHA
                hojaActiva.getRange(filaInicio, 12, numFilas, 1).setValue(encargadoCalidad);
                hojaActiva.getRange(filaInicio, 10, numFilas, 1).setValue(ahora).setNumberFormat("hh:mmam/pm dd/MM/yy");
  
                // 3. CÁLCULO VECTORIZADO DE TIEMPOS (usar 'ahora' directamente como fecha de fin)
                let tiemposCalculados = [];
                let tieneErrores = false;
  
                for (let k = 0; k < numFilas; k++) {
                  let valI = rangoInicios[k][0];
                  // Usar 'ahora' directamente como fecha de fin en lugar de leer de la hoja
                  // para evitar problemas de propagación
                  let resultadoTiempo = calcularTiempoNetoInterno(valI, ahora);
                  // Si el resultado es "ERR" o no es un número válido, mantener "ERR"
                  if (resultadoTiempo === "ERR" || isNaN(resultadoTiempo) || resultadoTiempo === null) {
                    tiemposCalculados.push(["ERR"]);
                    tieneErrores = true;
                  } else {
                    tiemposCalculados.push([resultadoTiempo]);
                  }
                }
                
                // Escribir tiempos: si hay errores, escribir sin formato numérico para preservar "ERR"
                if (tieneErrores) {
                  hojaActiva.getRange(filaInicio, 14, numFilas, 1).setValues(tiemposCalculados);
                  // Aplicar formato solo a los valores numéricos
                  for (let k = 0; k < numFilas; k++) {
                    if (tiemposCalculados[k][0] !== "ERR") {
                      hojaActiva.getRange(filaInicio + k, 14).setNumberFormat("0.00");
                    }
                  }
                } else {
                  hojaActiva.getRange(filaInicio, 14, numFilas, 1).setValues(tiemposCalculados).setNumberFormat("0.00");
                }
  
                escrituraBloqueRealizada = true;
  
                SpreadsheetApp.flush();
              }
  
              // >>> PASO B: ESCRITURA INDIVIDUAL <<<
              else if (numFilas === 1) {
                // Si el estado anterior era PARCIAL o REPARACION, no volver a pedir firma de QC
                const estadoAnterior = (e && typeof e.oldValue === "string")
                  ? String(e.oldValue).trim().toUpperCase()
                  : "";
  
                let encargadoCalidad = hojaActiva.getRange(filaActual, 14).getValue();
                if (String(encargadoCalidad).trim() === "") {
                  // Para REPARACION: reutilizar QC ya registrado en col 12 si existe
                  if (estadoAnterior === "REPARACION") {
                    const qcReparacion = hojaActiva.getRange(filaActual, 12).getValue();
                    if (String(qcReparacion).trim() !== "") {
                      encargadoCalidad = qcReparacion;
                    }
                  }
                  // Para PARCIAL: no pedir nueva firma; solo usar memoria si existe
                  if (estadoAnterior === "PARCIAL" && !encargadoCalidad && memoriaQCFab) {
                    encargadoCalidad = memoriaQCFab;
                  }
                  // Si sigue vacío y no es PARCIAL o REPARACION con QC, pedir firma normalmente
                  if (String(encargadoCalidad).trim() === "" && estadoAnterior !== "PARCIAL" && estadoAnterior !== "REPARACION") {
                    if (memoriaQCFab) encargadoCalidad = memoriaQCFab;
                    else {
                      // MENU ESTRICTO INDIVIDUAL QC
                      let firmaObtenida = solicitarFirmaQCFabricacion("✅ CONTROL DE CALIDAD");
                      if (firmaObtenida && firmaObtenida !== "") {
                        memoriaQCFab = firmaObtenida;
                        encargadoCalidad = memoriaQCFab;
                      } else {
                        // Error o cancelado: mantener estado ENTREGADO pero mostrar advertencia
                        
                        // Asegurar que el estado se mantenga en ENTREGADO
                        hojaActiva.getRange(filaActual, col).setValue("ENTREGADO");
                        SpreadsheetApp.flush();
                        // Aplicar color verde inmediatamente
                        aplicarColoresEstadoFabricacion(hojaActiva, filaActual, 1);
                        continue;
                      }
                    }
                  }
                }
                hojaActiva.getRange(filaActual, 14).setValue(encargadoCalidad);
                hojaActiva.getRange(filaActual, 10).setValue(ahora).setNumberFormat("hh:mmam/pm dd/MM/yy");
                try { calcularTiempoFila(hojaActiva, filaActual, ahora); } catch (e) { }
                // Refuerzo: asegurar que el estado permanezca en ENTREGADO para esta fila hija
                hojaActiva.getRange(filaActual, col).setValue("ENTREGADO");
              }
  
              try { cerrarCicloReparacionEnLog(ss, hojaActiva, filaActual, ahora); } catch (e) { }
            }
  
            // CASO 3: REMATE (firma QC obligatoria al pasar a ENTREGADO)
            if (nombreHoja === 'Remate') {
              const colorFilaActualRem = hojaActiva.getRange(filaActual, 1).getFontColor();
              const esHijoRem = (colorFilaActualRem === "#999999");
              if (numFilas === 1 && esHijoRem) {
                const oldEstRem = (e && typeof e.oldValue === "string") ? String(e.oldValue).trim().toUpperCase() : "";
                if (oldEstRem !== "ENTREGADO") {
                  const respSelTipo = ui.prompt(
                    " 📦  ENTREGA ",
                    "¿Desea entregar solo este conjunto o varios?\n\n" +
                    "1 - Solo este conjunto\n" +
                    "2 - Seleccionar mas conjuntos\n\n" +
                    "Ingrese 1 o 2.",
                    ui.ButtonSet.OK_CANCEL
                  );
                  if (!respSelTipo || respSelTipo.getSelectedButton() !== ui.Button.OK) {
                    PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
                    hojaActiva.getRange(filaActual, col).setValue(e.oldValue || "EN REMATE");
                    return;
                  }
                  const optRem = String(respSelTipo.getResponseText() || "").trim();
                  if (optRem === "2") {
                    PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
                    hojaActiva.getRange(filaActual, col).setValue(e.oldValue || "EN REMATE");
                    SpreadsheetApp.flush();
                    ejecutarEntregaSelectivaRemateDesdeHijoPorPrompt_(ss, hojaActiva, filaActual, ahora, e.oldValue || "EN REMATE");
                    return;
                  }
                  if (optRem !== "1") {
                    PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
                    hojaActiva.getRange(filaActual, col).setValue(e.oldValue || "EN REMATE");
                    return;
                  }
                }
              }

              const COL_OPERARIO_REMATE = 10; // Columna J
              if (numFilas > 1 && !escrituraBloqueRemateRealizada) {
                // 1. Control de calidad
                let encargadoCalidadRemate = hojaActiva.getRange(filaInicio, 11).getValue();
                if (String(encargadoCalidadRemate).trim() === "") {
                  if (memoriaQCRemate) {
                    encargadoCalidadRemate = memoriaQCRemate;
                  } else {
                    let firmaRemate = solicitarFirmaQCRemate("✅ REMATE - CONTROL DE CALIDAD");
                    if (!firmaRemate || firmaRemate === "") {
                      hojaActiva.getRange(filaInicio, col, numFilas, 1).setValue("EN REMATE");
                      SpreadsheetApp.flush();
                      aplicarColoresEstadoRemate(hojaActiva, filaInicio, numFilas);
                      continue;
                    }
                    memoriaQCRemate = firmaRemate;
                    encargadoCalidadRemate = firmaRemate;
                  }
                }
                // 2. Operario a cargo del proceso (columna J)
                let operarioRemate = hojaActiva.getRange(filaInicio, COL_OPERARIO_REMATE).getValue();
                if (String(operarioRemate).trim() === "") {
                  let respOpRem = ui.prompt(" 👷  REMATE - OPERARIO A CARGO", "Indique quién fue el operario a cargo del proceso de remate:", ui.ButtonSet.OK_CANCEL);
                  if (respOpRem.getSelectedButton() != ui.Button.OK || !respOpRem.getResponseText().trim()) {
                    hojaActiva.getRange(filaInicio, col, numFilas, 1).setValue("EN REMATE");
                    SpreadsheetApp.flush();
                    aplicarColoresEstadoRemate(hojaActiva, filaInicio, numFilas);
                    continue;
                  }
                  operarioRemate = respOpRem.getResponseText().trim().toUpperCase();
                }
                for (let r = 0; r < numFilas; r++) {
                  hojaActiva.getRange(filaInicio + r, 11).setValue(encargadoCalidadRemate);
                  hojaActiva.getRange(filaInicio + r, COL_OPERARIO_REMATE).setValue(operarioRemate);
                }
                hojaActiva.getRange(filaInicio, col, numFilas, 1).setValue("ENTREGADO");
                escrituraBloqueRemateRealizada = true;
              } else if (numFilas === 1) {
                // 1. Control de calidad
                let encargadoCalidadRemate = hojaActiva.getRange(filaActual, 11).getValue();
                if (String(encargadoCalidadRemate).trim() === "") {
                  if (memoriaQCRemate) encargadoCalidadRemate = memoriaQCRemate;
                  else {
                    let firmaRemate = solicitarFirmaQCRemate("✅ REMATE - CONTROL DE CALIDAD");
                    if (!firmaRemate || firmaRemate === "") {
                      hojaActiva.getRange(filaActual, col).setValue("EN REMATE");
                      SpreadsheetApp.flush();
                      aplicarColoresEstadoRemate(hojaActiva, filaActual, 1);
                      continue;
                    }
                    memoriaQCRemate = firmaRemate;
                    encargadoCalidadRemate = firmaRemate;
                  }
                }
                // 2. Operario a cargo del proceso (columna J)
                let operarioRemate = hojaActiva.getRange(filaActual, COL_OPERARIO_REMATE).getValue();
                if (String(operarioRemate).trim() === "") {
                  let respOpRem = ui.prompt(" 👷  REMATE - OPERARIO A CARGO", "Indique quién fue el operario a cargo del proceso de remate:", ui.ButtonSet.OK_CANCEL);
                  if (respOpRem.getSelectedButton() != ui.Button.OK || !respOpRem.getResponseText().trim()) {
                    hojaActiva.getRange(filaActual, col).setValue("EN REMATE");
                    SpreadsheetApp.flush();
                    aplicarColoresEstadoRemate(hojaActiva, filaActual, 1);
                    continue;
                  }
                  operarioRemate = respOpRem.getResponseText().trim().toUpperCase();
                }
                hojaActiva.getRange(filaActual, 11).setValue(encargadoCalidadRemate);
                hojaActiva.getRange(filaActual, COL_OPERARIO_REMATE).setValue(operarioRemate);
                hojaActiva.getRange(filaActual, col).setValue("ENTREGADO");
              }
            }
  
            // CASO 4: LIMPIEZA (QC + operario a cargo obligatorios; columna J = operario)
            if (nombreHoja === 'Limpieza') {
              const colorFilaActualLimp = hojaActiva.getRange(filaActual, 1).getFontColor();
              const esHijoLimp = (colorFilaActualLimp === "#999999");
              if (numFilas === 1 && esHijoLimp) {
                const oldEstLimp = (e && typeof e.oldValue === "string") ? String(e.oldValue).trim().toUpperCase() : "";
                if (oldEstLimp !== "ENTREGADO") {
                  const respSelTipo = ui.prompt(
                    " 📦  ENTREGA ",
                    "¿Desea entregar solo este conjunto o varios?\n\n" +
                    "1 - Solo este conjunto\n" +
                    "2 - Seleccionar mas conjuntos\n\n" +
                    "Ingrese 1 o 2.",
                    ui.ButtonSet.OK_CANCEL
                  );
                  if (!respSelTipo || respSelTipo.getSelectedButton() !== ui.Button.OK) {
                    PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
                    hojaActiva.getRange(filaActual, col).setValue(e.oldValue || "EN LIMPIEZA");
                    return;
                  }
                  const optLimp = String(respSelTipo.getResponseText() || "").trim();
                  if (optLimp === "2") {
                    PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
                    hojaActiva.getRange(filaActual, col).setValue(e.oldValue || "EN LIMPIEZA");
                    SpreadsheetApp.flush();
                    ejecutarEntregaSelectivaLimpiezaDesdeHijoPorPrompt_(ss, hojaActiva, filaActual, ahora, e.oldValue || "EN LIMPIEZA");
                    return;
                  }
                  if (optLimp !== "1") {
                    PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
                    hojaActiva.getRange(filaActual, col).setValue(e.oldValue || "EN LIMPIEZA");
                    return;
                  }
                }
              }

              const COL_OPERARIO_LIMPIEZA = 10; // Columna J
              if (numFilas > 1 && !escrituraBloqueLimpiezaRealizada) {
                // 1. Control de calidad
                let encargadoCalidadLimpieza = hojaActiva.getRange(filaInicio, 11).getValue();
                if (String(encargadoCalidadLimpieza).trim() === "") {
                  if (memoriaQCRemate) {
                    encargadoCalidadLimpieza = memoriaQCRemate;
                  } else {
                    let firmaLimpieza = solicitarFirmaQCRemate("✅ LIMPIEZA - CONTROL DE CALIDAD");
                    if (!firmaLimpieza || firmaLimpieza === "") {
                      hojaActiva.getRange(filaInicio, col, numFilas, 1).setValue("EN LIMPIEZA");
                      SpreadsheetApp.flush();
                      aplicarColoresEstadoLimpieza(hojaActiva, filaInicio, numFilas);
                      continue;
                    }
                    memoriaQCRemate = firmaLimpieza;
                    encargadoCalidadLimpieza = firmaLimpieza;
                  }
                }
                // 2. Operario a cargo del proceso (columna J)
                let operarioLimpieza = hojaActiva.getRange(filaInicio, COL_OPERARIO_LIMPIEZA).getValue();
                if (String(operarioLimpieza).trim() === "") {
                  let respOpLimp = ui.prompt(" 👷  LIMPIEZA - OPERARIO A CARGO", "Indique quién fue el operario a cargo del proceso de limpieza:", ui.ButtonSet.OK_CANCEL);
                  if (respOpLimp.getSelectedButton() != ui.Button.OK || !respOpLimp.getResponseText().trim()) {
                    hojaActiva.getRange(filaInicio, col, numFilas, 1).setValue("EN LIMPIEZA");
                    SpreadsheetApp.flush();
                    aplicarColoresEstadoLimpieza(hojaActiva, filaInicio, numFilas);
                    continue;
                  }
                  operarioLimpieza = respOpLimp.getResponseText().trim().toUpperCase();
                }
                for (let r = 0; r < numFilas; r++) {
                  hojaActiva.getRange(filaInicio + r, 11).setValue(encargadoCalidadLimpieza);
                  hojaActiva.getRange(filaInicio + r, COL_OPERARIO_LIMPIEZA).setValue(operarioLimpieza);
                }
                hojaActiva.getRange(filaInicio, col, numFilas, 1).setValue("ENTREGADO");
                escrituraBloqueLimpiezaRealizada = true;
              } else if (numFilas === 1) {
                // 1. Control de calidad
                let encargadoCalidadLimpieza = hojaActiva.getRange(filaActual, 11).getValue();
                if (String(encargadoCalidadLimpieza).trim() === "") {
                  if (memoriaQCRemate) encargadoCalidadLimpieza = memoriaQCRemate;
                  else {
                    let firmaLimpieza = solicitarFirmaQCRemate("✅ LIMPIEZA - CONTROL DE CALIDAD");
                    if (!firmaLimpieza || firmaLimpieza === "") {
                      hojaActiva.getRange(filaActual, col).setValue("EN LIMPIEZA");
                      SpreadsheetApp.flush();
                      aplicarColoresEstadoLimpieza(hojaActiva, filaActual, 1);
                      continue;
                    }
                    memoriaQCRemate = firmaLimpieza;
                    encargadoCalidadLimpieza = firmaLimpieza;
                  }
                }
                // 2. Operario a cargo del proceso (columna J)
                let operarioLimpieza = hojaActiva.getRange(filaActual, COL_OPERARIO_LIMPIEZA).getValue();
                if (String(operarioLimpieza).trim() === "") {
                  let respOpLimp = ui.prompt(" 👷  LIMPIEZA - OPERARIO A CARGO", "Indique quién fue el operario a cargo del proceso de limpieza:", ui.ButtonSet.OK_CANCEL);
                  if (respOpLimp.getSelectedButton() != ui.Button.OK || !respOpLimp.getResponseText().trim()) {
                    hojaActiva.getRange(filaActual, col).setValue("EN LIMPIEZA");
                    SpreadsheetApp.flush();
                    aplicarColoresEstadoLimpieza(hojaActiva, filaActual, 1);
                    continue;
                  }
                  operarioLimpieza = respOpLimp.getResponseText().trim().toUpperCase();
                }
                hojaActiva.getRange(filaActual, 11).setValue(encargadoCalidadLimpieza);
                hojaActiva.getRange(filaActual, COL_OPERARIO_LIMPIEZA).setValue(operarioLimpieza);
                hojaActiva.getRange(filaActual, col).setValue("ENTREGADO");
              }
            }
  
            // Técnica: ejecutar traspaso y acciones solo UNA vez por conjunto (evitar repetir por cada fila seleccionada)
            let ejecutarAccionTecnica = true;
            if (nombreHoja === 'Técnica') {
              const colorFilaTec = hojaActiva.getRange(filaActual, 1).getFontColor();
              let filaMadreTec = filaActual;
              if (colorFilaTec === "#999999") {
                let idx = filaActual - 1;
                while (idx >= 1 && hojaActiva.getRange(idx, 1).getFontColor() === "#999999") idx--;
                filaMadreTec = idx >= 1 ? idx : filaActual;
              }
              // Si hay varias filas seleccionadas, solo ejecutar cuando estamos en la fila madre (evitar duplicar traspaso/colores)
              if (numFilas > 1 && filaActual !== filaMadreTec) ejecutarAccionTecnica = false;
            }
  
            if (ejecutarAccionTecnica) {
              // Señalizar traspaso en curso para bloquear nuevos ENTREGADO en Técnica hasta finalizar
              if (nombreHoja === 'Técnica' && !skipTraspasoTecnica) {
                const codigoTraspasoActual = String(hojaActiva.getRange(filaActual, 1).getValue() || "").trim().toUpperCase();
                PropertiesService.getScriptProperties().setProperty(KEY_TRASPASO_TEC, String(Date.now()) + "|" + codigoTraspasoActual);
                traspasoTecTomado = true;
              }
              try {
                // En Fabricación, primero propagar ENTREGADO a hijos (si corresponde) y luego traspasar,
                // para que Remate reciba madre + hijos en una sola pasada.
                if (aplicarCascada && nombreHoja === 'Fabricación') {
                  let valQC = hojaActiva.getRange(filaActual, 14).getValue();
                  cascadaEstadoMasivo(hojaActiva, filaActual, ahora, "ENTREGADO", null, valQC);
                }
              ejecutarAccionesEntregado(ss, hojaActiva, filaActual, nombreHoja, ahora, {
                skipTraspaso: skipTraspasoTecnica,
                operarioFabricacion: operarioFabEntregaTecnica
              });
                if (nombreHoja === 'Fabricación' && cierreTotalDesdeMadreFab) {
                  cierreTotalPlanificacionDesdeFabricacion(ss, hojaActiva, filaActual, ahora);
                }
                if (nombreHoja === 'Técnica' && !skipTraspasoTecnica) {
                  traspasoTecnicaHechoEnEstaEdicion = true;
                }
                // Siempre intentar drenar cola en Técnica, incluso si esta edición quedó encolada.
                if (nombreHoja === 'Técnica') {
                  procesarColaTraspasosTecnica(ss, ahora);
                }
              } finally {
                if (traspasoTecTomado) {
                  PropertiesService.getScriptProperties().deleteProperty(KEY_TRASPASO_TEC);
                }
              }
            }
          // Dashboard solo depende de Fabricación.
          if (nombreHoja === 'Fabricación') {
              flagRecalculoGlobal = true;
            }
          }
  
          // Actualizar color de fondo según estado (Técnica, Remate o Limpieza). En Técnica solo una vez por conjunto.
          if (nombreHoja === 'Técnica' && valor === "ENTREGADO") {
            const colorFilaTec = hojaActiva.getRange(filaActual, 1).getFontColor();
            let filaMadreTec = filaActual;
            if (colorFilaTec === "#999999") {
              let idx = filaActual - 1;
              while (idx >= 1 && hojaActiva.getRange(idx, 1).getFontColor() === "#999999") idx--;
              filaMadreTec = idx >= 1 ? idx : filaActual;
            }
            // Solo pintar cuando estamos en la fila madre (o una sola fila); solo filas del mismo grupo (mismo código)
            if (numFilas === 1 || filaActual === filaMadreTec) {
              const codigoMadreTec = String(hojaActiva.getRange(filaMadreTec, 1).getValue()).trim().toUpperCase();
              let numHijosTec = 0;
              let f = filaMadreTec + 1;
              while (f <= hojaActiva.getLastRow()) {
                const colorF = hojaActiva.getRange(f, 1).getFontColor();
                const codigoF = String(hojaActiva.getRange(f, 1).getValue()).trim().toUpperCase();
                if (colorF !== "#999999" || codigoF !== codigoMadreTec) break;
                numHijosTec++;
                f++;
              }
              aplicarColoresEstadoTecnica(hojaActiva, filaMadreTec, 1 + numHijosTec);
            }
          }
          if (nombreHoja === 'Fabricación' && (valor === "ENTREGADO" || valor === "ENTREGA CON OBSERVACION")) {
            aplicarColoresEstadoFabricacion(hojaActiva, filaActual, numFilas);
          }
          if (nombreHoja === 'Remate') {
            aplicarColoresEstadoRemate(hojaActiva, filaActual, numFilas);
          }
          if (nombreHoja === 'Limpieza') {
            aplicarColoresEstadoLimpieza(hojaActiva, filaActual, numFilas);
          }
  
          const colorFila = hojaActiva.getRange(filaActual, 1).getFontColor();
          if (colorFila === "#999999") {
            sincronizarEstadoMadre(ss, hojaActiva, filaActual, nombreHoja, ahora, traspasoTecnicaHechoEnEstaEdicion);
          }
        }
  
        if (nombreHoja === 'Fabricación' && (col === 5 || col === 11)) {
          flagRecalculoGlobal = true;
        }
      }
  
      if (flagRecalculoGlobal) {
        Utilities.sleep(50);
        recalcularTotalDelDia();
      }
  
    } catch (eGlobal) {
      Logger.log("Error en gestionarEdicion: " + eGlobal.toString());
    }
  }
  
  // ------------------------------------------------------------------
  // ENTREGA SELECTIVA DESDE MADRE (FABRICACIÓN)
  // ------------------------------------------------------------------
  
  function _obtenerBloqueHijosFabricacionDesdeFila_(hojaFabricacion, filaCualquieraDelBloque) {
    const lastRow = hojaFabricacion.getLastRow();
    const datos = hojaFabricacion.getDataRange().getValues();
    const colores = hojaFabricacion.getRange(1, 1, Math.max(datos.length, 1), 1).getFontColors();
  
    // Subir hasta la madre
    let idxMadre = filaCualquieraDelBloque - 1;
    while (idxMadre >= 1 && colores[idxMadre] && colores[idxMadre][0] === "#999999") idxMadre--;
    if (idxMadre < 1) return null;
    const filaMadre = idxMadre + 1;
    const codigoPlan = String(datos[idxMadre][0] || "").trim();
    if (!codigoPlan) return null;
  
    // Enumerar hijos consecutivos
    const hijos = [];
    for (let i = idxMadre + 1; i < datos.length; i++) {
      if (!colores[i] || colores[i][0] !== "#999999") break;
      if (String(datos[i][0] || "").trim() !== codigoPlan) break;
      const rowAbs = i + 1;
      const estado = String(datos[i][6] || "").trim().toUpperCase();
      if (estado === "ENTREGADO") continue;
      hijos.push({
        row: rowAbs,
        codigoConjunto: String(datos[i][1] || "").trim(),
        cantidad: datos[i][2] || "",
        pesoTotal: datos[i][4] || "",
        estado
      });
    }
    return { filaMadre, codigoPlan, hijos };
  }
  
  function ejecutarEntregaSelectivaFabricacionDesdeHijoPorPrompt_(ss, hojaFabricacion, filaHijoActual, ahora, oldValue) {
    const ui = SpreadsheetApp.getUi();
    const bloque = _obtenerBloqueHijosFabricacionDesdeFila_(hojaFabricacion, filaHijoActual);
    if (!bloque || !bloque.hijos || bloque.hijos.length === 0) {
      ss.toast("Sin piezas disponibles para seleccionar.", "ESCARMETAL", 6);
      // Si no hay otros, dejar que el flujo normal entregue este hijo.
      return;
    }
  
    // Lock global para evitar reentradas/duplicados y escrituras parciales.
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
    } catch (eLock) {
      try { ss.toast("Sistema ocupado. Reintente en 5 segundos.", "ESCARMETAL", 6); } catch (e2) { }
      PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
      hojaFabricacion.getRange(filaHijoActual, 7).setValue(oldValue || "FABRICANDO");
      return;
    }
  
    // QC obligatorio (formato "CORTO|COMPLETO")
    const qcRaw = _solicitarQCFabricacionPorPrompt_();
    if (!qcRaw) {
      PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
      hojaFabricacion.getRange(filaHijoActual, 7).setValue(oldValue || "FABRICANDO");
      try { lock.releaseLock(); } catch (eRel) { }
      return;
    }
    const qcParts = String(qcRaw).split("|");
    const qcCorto = String(qcParts[0] || "").trim().toUpperCase();
    const qcCompleto = String(qcParts.slice(1).join("|") || qcCorto).trim().toUpperCase();
  
    // Lista numerada (incluye el hijo actual si está en el set de disponibles)
    const disponibles = bloque.hijos.slice();
    // Asegurar que el hijo actual esté incluido si aún no estaba entregado
    if (!disponibles.some(h => h.row === filaHijoActual)) {
      // Si el hijo actual ya estaba en ENTREGADO, no hace falta; si no, incluirlo.
      disponibles.unshift({
        row: filaHijoActual,
        codigoConjunto: String(hojaFabricacion.getRange(filaHijoActual, 2).getValue() || "").trim(),
        cantidad: hojaFabricacion.getRange(filaHijoActual, 3).getValue() || "",
        pesoTotal: hojaFabricacion.getRange(filaHijoActual, 5).getValue() || "",
        estado: String(hojaFabricacion.getRange(filaHijoActual, 7).getValue() || "").trim().toUpperCase()
      });
    }
  
    const maxMostrar = disponibles.length;
    const lista = disponibles.slice(0, maxMostrar).map((h, idx) => {
      const n = idx + 1;
      const nombreConjunto = String(h.codigoConjunto || "").trim() || "-";
      return `${n}) ${nombreConjunto}`;
    }).join("\n");
  
    // Lista en alert(s) para leer con calma; la misma lista se repite en el prompt para no olvidar al escribir.
    const cabLista =
      "Revise el número de cada pieza y pulse Aceptar.\n" +
      "Luego escribirá solo los números separados por coma (ej. 1,2,3).\n\n";
    const limAlert = 1800;
    let resto = cabLista + lista;
    while (resto.length > 0) {
      if (resto.length <= limAlert) {
        ui.alert("📦 Lista de piezas", resto, ui.ButtonSet.OK);
        break;
      }
      let corte = resto.lastIndexOf("\n", limAlert);
      if (corte < cabLista.length) corte = limAlert;
      ui.alert("📦 Lista de piezas", resto.substring(0, corte), ui.ButtonSet.OK);
      resto = resto.substring(corte).replace(/^\n+/, "");
    }
  
    const introPrompt =
      "Escriba NÚMEROS o CÓDIGOS de conjunto separados por coma.\n" +
      "Ejemplo: 1,2,3 o V90,V91\n\nCancelar = no aplicar.\n\n--- Lista (misma que arriba) ---\n";
    let cuerpoPrompt = introPrompt + lista;
    const limPrompt = 3500;
    if (cuerpoPrompt.length > limPrompt) {
      let cut = cuerpoPrompt.lastIndexOf("\n", limPrompt - 80);
      if (cut < introPrompt.length) cut = Math.max(introPrompt.length, limPrompt - 80);
      cuerpoPrompt = cuerpoPrompt.substring(0, cut) + "\n… (resto en los cuadros anteriores)";
    }
  
    const respSel = ui.prompt(
      "📦 Números a entregar",
      cuerpoPrompt,
      ui.ButtonSet.OK_CANCEL
    );
    if (!respSel || respSel.getSelectedButton() !== ui.Button.OK) {
      PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
      hojaFabricacion.getRange(filaHijoActual, 7).setValue(oldValue || "FABRICANDO");
      try { lock.releaseLock(); } catch (eRel) { }
      return;
    }
  
    const txt = String(respSel.getResponseText() || "").trim();
    const tokens = txt.split(/[,\s]+/g).map(t => String(t || "").trim()).filter(Boolean);
    const rowsSeleccionadas = [];
    const tope = Math.min(disponibles.length, maxMostrar);
    tokens.forEach(tok => {
      const n = parseInt(tok, 10);
      if (!isNaN(n) && n >= 1 && n <= tope) {
        rowsSeleccionadas.push(disponibles[n - 1].row);
        return;
      }
      const tUp = tok.toUpperCase();
      const idx = disponibles.findIndex(h => String(h.codigoConjunto || "").trim().toUpperCase() === tUp);
      if (idx >= 0 && idx < tope) rowsSeleccionadas.push(disponibles[idx].row);
    });
    const uniq = Array.from(new Set(rowsSeleccionadas));
    if (uniq.length === 0) {
      PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
      hojaFabricacion.getRange(filaHijoActual, 7).setValue(oldValue || "FABRICANDO");
      try { lock.releaseLock(); } catch (eRel) { }
      return;
    }
    const filas = uniq.slice();
    const momento = ahora instanceof Date ? ahora : new Date();
  
    try {
      // Bloquear reentradas por escrituras programáticas durante la operación completa.
      PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
  
      // IMPORTANTE: las filas seleccionadas NO siempre son contiguas.
      // Usamos RangeList para escribir el mismo valor en múltiples filas sin pisar filas intermedias.
      const filasOrdenadas = filas.slice().sort((a, b) => a - b);
      const rangesEstado = filasOrdenadas.map(r => hojaFabricacion.getRange(r, 7).getA1Notation());
      const rangesFin = filasOrdenadas.map(r => hojaFabricacion.getRange(r, 10).getA1Notation());
      const rangesQCFull = filasOrdenadas.map(r => hojaFabricacion.getRange(r, 12).getA1Notation());
      const rangesQCCorto = filasOrdenadas.map(r => hojaFabricacion.getRange(r, 15).getA1Notation());
  
      hojaFabricacion.getRangeList(rangesEstado).setValue("ENTREGADO");
      hojaFabricacion.getRangeList(rangesFin).setValue(momento).setNumberFormat("hh:mmam/pm dd/MM/yy");
      hojaFabricacion.getRangeList(rangesQCFull).setValue(qcCompleto);
      hojaFabricacion.getRangeList(rangesQCCorto).setValue(qcCorto);
  
      _aplicarTiemposEntregaSelectivaFab_(hojaFabricacion, filasOrdenadas, momento);
  
      // Colores + sincronización madre (por fila; son pocas, máx 9)
      for (const r of filasOrdenadas) {
        try { aplicarColoresEstadoFabricacion(hojaFabricacion, r, 1); } catch (e) { }
        try { sincronizarEstadoMadre(ss, hojaFabricacion, r, "Fabricación", momento, false, true); } catch (e) { }
      }
  
      SpreadsheetApp.flush();
  
      // TRASPASO SIMPLE E INMEDIATO A REMATE (desde la MADRE)
      const hojaRemate = ss.getSheetByName("Remate");
      if (!hojaRemate) throw new Error("No existe la hoja 'Remate'.");
      // Lote completo (todos los ENTREGADO del bloque), sin filtrar por col B de la madre
      const resTr = traspasoMasivoFabricacion(hojaFabricacion, hojaRemate, bloque.filaMadre, momento, undefined, undefined, true);
      _mostrarAlertaDiagnosticoTraspasoFab_(ui, resTr);
  
      SpreadsheetApp.flush();
      try { recalcularTotalDelDia(); } catch (e) { }
      try { ss.toast("Entrega selectiva OK. Piezas ENTREGADO: " + filasOrdenadas.length, "ESCARMETAL", 8); } catch (e) { }
    } catch (eOp) {
      try { ss.toast("ERROR entrega selectiva: " + String(eOp && eOp.message ? eOp.message : eOp), "ESCARMETAL", 12); } catch (e2) { }
      // Intentar revertir el hijo que disparó (para que el usuario note que no terminó)
      try {
        PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
        hojaFabricacion.getRange(filaHijoActual, 7).setValue(oldValue || "FABRICANDO");
      } catch (eR) { }
    } finally {
      try { lock.releaseLock(); } catch (eRel) { }
    }
  }
  
  /** Abre el libro por ID si el entorno lo permite; si no, el activo (p. ej. script contenedor). */
  function _abrirSsParaEntregaSelectiva_(spreadsheetId) {
    const id = spreadsheetId ? String(spreadsheetId).trim() : "";
    if (id) {
      try {
        return SpreadsheetApp.openById(id);
      } catch (e) { /* sin alcance openById */ }
    }
    return SpreadsheetApp.getActiveSpreadsheet();
  }
  
  /** Triggers antiguos timeBased: ya no se usa; evita error si quedó alguno instalado. */
  function entregaSelectivaHijoModalDeferred_() { }
  
  function _qcFabNombreACortoCompleto_(nom) {
    const s = String(nom || "").trim().toUpperCase();
    if (s === "ALAN GONZALEZ" || s === "ALAN") return { corto: "ALAN", completo: "ALAN GONZALEZ" };
    if (s === "VICTOR LEIVA" || s === "VICTOR") return { corto: "VICTOR", completo: "VICTOR LEIVA" };
    if (s === "LUIS ULLOA" || s === "LUIS") return { corto: "LUIS", completo: "LUIS ULLOA" };
    if (s === "FRANCISCO SAN MARTIN" || s === "FRANCISCO") return { corto: "FRANCISCO", completo: "FRANCISCO SAN MARTIN" };
    return null;
  }
  
  function _solicitarQCFabricacionPorPrompt_() {
    const ui = SpreadsheetApp.getUi();
    const msg = "Seleccione Encargado de Calidad - FABRICACIÓN (OBLIGATORIO):\n\n" +
      "1 - ALAN GONZALEZ\n" +
      "2 - FRANCISCO SAN MARTIN\n" +
      "3 - LUIS ULLOA\n" +
      "4 - VICTOR LEIVA\n\n" +
      "Ingrese SOLO el número";
    const resp = ui.prompt("✅ CALIDAD - ENTREGA SELECTIVA", msg, ui.ButtonSet.OK_CANCEL);
    if (!resp || resp.getSelectedButton() !== ui.Button.OK) return null;
    const txt = String(resp.getResponseText() || "").trim();
    // Retorna "CORTO|COMPLETO"
    if (txt === "1") return "ALAN|ALAN GONZALEZ";
    if (txt === "2") return "FRANCISCO|FRANCISCO SAN MARTIN";
    if (txt === "3") return "LUIS|LUIS ULLOA";
    if (txt === "4") return "VICTOR|VICTOR LEIVA";
    ui.alert(" ⛔  ERROR DE SELECCIÓN", "Entrada no válida.\nSolo se permite '1' o '2'.\nOperación cancelada.", ui.ButtonSet.OK);
    return null;
  }
  
  function traspasarEntregadosFabricacionARemate_(ss, hojaFabricacion, filaMadreFab, ahora) {
    const hojaRemate = ss.getSheetByName("Remate");
    if (!hojaRemate) {
      throw new Error("No existe la hoja 'Remate' (verifique el nombre exacto de la pestaña).");
    }
  
    const codigoPlan = String(hojaFabricacion.getRange(filaMadreFab, 1).getValue() || "").trim();
    if (!codigoPlan) return;
  
    // 1) Obtener filas ENTREGADO del bloque (sin depender de color).
    // Recorremos hacia abajo mientras el código de planificación (col A) sea el mismo.
    const lastFab = hojaFabricacion.getLastRow();
    const max = Math.max(0, lastFab - filaMadreFab);
    const vals = max > 0 ? hojaFabricacion.getRange(filaMadreFab + 1, 1, max, 18).getValues() : [];
  
    const hijosEntregados = [];
    for (let i = 0; i < vals.length; i++) {
      const cod = String(vals[i][0] || "").trim();
      if (!cod || cod !== codigoPlan) break;
      const estado = String(vals[i][6] || "").trim().toUpperCase();
      if (estado !== "ENTREGADO") continue;
      hijosEntregados.push(vals[i]); // 18 columnas
    }
    if (hijosEntregados.length === 0) {
      throw new Error("No se encontraron filas en estado ENTREGADO bajo la madre (mismo código en col A).");
    }
  
    // 2) Buscar madre existente en Remate
    const datosRem = hojaRemate.getDataRange().getValues();
    const colRem = hojaRemate.getRange(1, 1, Math.max(datosRem.length, 1), 1).getFontColors();
    let remateMadreRow = 0;
    let remateLastHijoRow = 0;
    const remateKeys = new Set(); // key: conj|cant|pesoTot
    const hijosExistentesPorCodigo = {}; // codigoConj -> row
  
    for (let i = 1; i < datosRem.length; i++) {
      if (String(datosRem[i][0] || "").trim() !== codigoPlan) continue;
      if (colRem[i] && colRem[i][0] === "#999999") continue;
      remateMadreRow = i + 1;
      remateLastHijoRow = i + 1;
      for (let j = i + 1; j < datosRem.length; j++) {
        if (!colRem[j] || colRem[j][0] !== "#999999") break;
        if (String(datosRem[j][0] || "").trim() !== codigoPlan) break;
        const key = String(datosRem[j][1]).trim() + "|" + String(datosRem[j][2]).trim() + "|" + String(datosRem[j][4]).trim();
        remateKeys.add(key);
        const codConj = String(datosRem[j][1] || "").trim().toUpperCase();
        if (codConj) hijosExistentesPorCodigo[codConj] = j + 1;
        remateLastHijoRow = j + 1;
      }
      break;
    }
  
    // Validaciones Remate
    const reglaMenu = SpreadsheetApp.newDataValidation()
      .requireValueInList(['EN REMATE', 'ENTREGADO'], true)
      .setAllowInvalid(false)
      .build();
    const listaQCRemate = ['FRANCISCO SAN MARTÍN', 'LUIS ULLOA', 'VICTOR LEIVA'];
    const reglaQC = SpreadsheetApp.newDataValidation().requireValueInList(listaQCRemate, true).setAllowInvalid(false).build();
  
    // 3) Armar filas para Remate: madre + hijos ENTREGADO (solo columnas 1..6)
    const construirFilaRemate = (src18, esHijo) => {
      const out = new Array(18).fill("");
      for (let k = 0; k < 6; k++) out[k] = src18[k];
      out[6] = "EN REMATE";
      out[7] = ahora;
      return { out, color: esHijo ? "#999999" : "#000000" };
    };
  
    // Madre (desde la fila madre de Fabricación)
    const madreSrc = hojaFabricacion.getRange(filaMadreFab, 1, 1, 18).getValues()[0];
    const madreRem = construirFilaRemate(madreSrc, false);
  
    // Hijos
    const hijosRem = [];
    for (const h of hijosEntregados) {
      const key = String(h[1]).trim() + "|" + String(h[2]).trim() + "|" + String(h[4]).trim();
      if (remateKeys.has(key)) continue; // ya existe exacto
      hijosRem.push(construirFilaRemate(h, true));
    }
  
    // 4) Si no existe madre en Remate: insertar madre + hijos nuevos al inicio
    if (remateMadreRow === 0) {
      const filas = [madreRem, ...hijosRem];
      const cantidad = filas.length;
      hojaRemate.insertRows(2, cantidad);
      const rango = hojaRemate.getRange(2, 1, cantidad, 18);
      rango.clearDataValidations();
      rango.setValues(filas.map(f => f.out));
      hojaRemate.getRange(2, 1, cantidad, 1).setFontColors(filas.map(f => [f.color]));
      hojaRemate.getRange(2, 7, cantidad, 1).setDataValidation(reglaMenu);
      hojaRemate.getRange(2, 11, cantidad, 1).setDataValidation(reglaQC);
  
      if (cantidad > 1) {
        hojaRemate.setRowGroupControlPosition(SpreadsheetApp.GroupControlTogglePosition.BEFORE);
        hojaRemate.getRange(3, 1, cantidad - 1, 1).shiftRowGroupDepth(1);
      }
      aplicarColoresEstadoRemate(hojaRemate, 2, cantidad);
      return;
    }
  
    // 5) Madre ya existe: insertar hijos faltantes debajo del último hijo
    if (hijosRem.length === 0) return;
    hojaRemate.insertRowsAfter(remateLastHijoRow, hijosRem.length);
    const filaIns = remateLastHijoRow + 1;
    const rangoN = hojaRemate.getRange(filaIns, 1, hijosRem.length, 18);
    rangoN.clearDataValidations();
    rangoN.setValues(hijosRem.map(f => f.out));
    hojaRemate.getRange(filaIns, 1, hijosRem.length, 1).setFontColors(hijosRem.map(f => [f.color]));
    hojaRemate.getRange(filaIns, 7, hijosRem.length, 1).setDataValidation(reglaMenu);
    hojaRemate.getRange(filaIns, 11, hijosRem.length, 1).setDataValidation(reglaQC);
  
    // Asegurar que queden dentro del grupo (si existe). Si no existe grupo, crear.
    try {
      hojaRemate.setRowGroupControlPosition(SpreadsheetApp.GroupControlTogglePosition.BEFORE);
      hojaRemate.getRange(remateMadreRow + 1, 1, (remateLastHijoRow + hijosRem.length) - remateMadreRow, 1).shiftRowGroupDepth(1);
    } catch (e) { }
  
    aplicarColoresEstadoRemate(hojaRemate, filaIns, hijosRem.length);
  }
  
  // ---------------------------
  // Cola Fabricación -> Remate
  // (evita fallas por onEdit/UI)
  // ---------------------------
  // (Se eliminó la cola Fabricación->Remate: ahora el traspaso es inmediato.)
  
  function _obtenerHijosDisponiblesFabricacion_(hojaFabricacion, filaMadre) {
    const codigoPlan = String(hojaFabricacion.getRange(filaMadre, 1).getValue() || "").trim();
    if (!codigoPlan) return [];
  
    const lastRow = hojaFabricacion.getLastRow();
    const max = Math.max(0, lastRow - filaMadre);
    if (max <= 0) return [];
  
    const rango = hojaFabricacion.getRange(filaMadre + 1, 1, max, 18);
    const vals = rango.getValues();
    const colors = hojaFabricacion.getRange(filaMadre + 1, 1, max, 1).getFontColors();
  
    const hijos = [];
    for (let i = 0; i < vals.length; i++) {
      const rowAbs = filaMadre + 1 + i;
      const esHijo = (colors[i] && colors[i][0] === "#999999");
      if (!esHijo) break;
      const cod = String(vals[i][0] || "").trim();
      if (cod !== codigoPlan) break;
      const estado = String(vals[i][6] || "").trim().toUpperCase();
      if (estado === "ENTREGADO") continue; // disponibles = aún no entregados
      hijos.push({
        row: rowAbs,
        codigoConjunto: String(vals[i][1] || "").trim(),
        cantidad: vals[i][2] || "",
        pesoTotal: vals[i][4] || "",
        estado
      });
    }
    return hijos;
  }
  
  /** True si el color de fuente en col A corresponde a fila hija (gris) en Fabricación. */
  function _esColorHijoFabricacion_(color) {
    if (color === undefined || color === null) return false;
    const s = String(color).replace(/\s/g, "").toLowerCase();
    if (s === "#999999" || s === "#999") return true;
    const m = s.match(/^rgb\((\d+),(\d+),(\d+)\)$/);
    if (m) {
      const r = parseInt(m[1], 10), g = parseInt(m[2], 10), b = parseInt(m[3], 10);
      return r === 153 && g === 153 && b === 153;
    }
    return false;
  }
  
  /** Muestra alerta si el traspaso Fab→Remate falló o no aplicó cambios (ok === false). */
  function _mostrarAlertaDiagnosticoTraspasoFab_(ui, res) {
    if (!res || res.ok) return;
    let u = ui;
    if (!u) {
      try { u = SpreadsheetApp.getUi(); } catch (e) { return; }
    }
    try {
      u.alert(
        " ⛔  FABRICACIÓN → REMATE",
        (res.detalle || res.motivo || "Error sin detalle.") + "\n\n[Código técnico: " + (res.motivo || "?") + "]",
        u.ButtonSet.OK
      );
    } catch (e) { }
  }
  
  /**
   * Traspaso Fabricación → Remate después de marcar varios hijos en entrega selectiva.
   * Siempre usa forzarTraspasoFab (masivo, sin filtrar por col B de la madre).
   * Devuelve el resultado de traspasoMasivoFabricacion y muestra UI si falla o no hubo cambios.
   */
  function traspasoRemateTrasEntregaSelectivaFabricacion_(ss, hojaFabricacion, filaMadre, momento) {
    let ui;
    try { ui = SpreadsheetApp.getUi(); } catch (e) { ui = null; }
    const hojaRemate = ss.getSheetByName("Remate");
    if (!hojaRemate) {
      const msg = "No se encontró una pestaña con nombre exacto \"Remate\".";
      if (ui) try { ui.alert(" ⛔  TRASPASO → REMATE", msg, ui.ButtonSet.OK); } catch (e2) { }
      return { ok: false, motivo: "NO_HOJA_REMATE", detalle: msg };
    }
    const codigoPlan = String(hojaFabricacion.getRange(filaMadre, 1).getValue() || "").trim().toUpperCase();
    if (!codigoPlan) {
      const msg = "La fila madre (" + filaMadre + ") no tiene código de planificación en la columna A.";
      if (ui) try { ui.alert(" ⛔  TRASPASO → REMATE", msg, ui.ButtonSet.OK); } catch (e2) { }
      return { ok: false, motivo: "SIN_CODIGO_MADRE", detalle: msg };
    }
    PropertiesService.getScriptProperties().setProperty("forzarTraspasoFab", codigoPlan);
    let res;
    try {
      res = traspasoMasivoFabricacion(hojaFabricacion, hojaRemate, filaMadre, momento, undefined, undefined, true);
    } catch (err) {
      const msg = String(err && err.message ? err.message : err);
      if (ui) try { ui.alert(" ⛔  ERROR EN TRASPASO", msg, ui.ButtonSet.OK); } catch (e2) { }
      return { ok: false, motivo: "EXCEPCION", detalle: msg };
    }
    if (!res || typeof res.ok !== "boolean") {
      const msg = "traspasoMasivoFabricacion no devolvió diagnóstico (copie de nuevo el script completo v17.40+).";
      if (ui) try { ui.alert(" ⛔  TRASPASO", msg, ui.ButtonSet.OK); } catch (e2) { }
      return { ok: false, motivo: "SIN_RESULTADO", detalle: msg };
    }
    if (!res.ok) {
      _mostrarAlertaDiagnosticoTraspasoFab_(ui, res);
    }
    return res;
  }
  
  function ejecutarEntregaSelectivaFabricacionPorPrompt_(ss, hojaFabricacion, filaMadre, ahora) {
    if (!ss || !hojaFabricacion) return;
    const ui = SpreadsheetApp.getUi();
    let hijosMarcados = 0;
    let traspasoHecho = false;
  
    const hijos = _obtenerHijosDisponiblesFabricacion_(hojaFabricacion, filaMadre);
    if (!hijos || hijos.length === 0) {
      try { ss.toast("Sin piezas disponibles para entrega selectiva.", "ESCARMETAL", 6); } catch (e) { }
      return;
    }
  
    // Pedir QC (obligatorio) formato "CORTO|COMPLETO"
    const qcRaw = _solicitarQCFabricacionPorPrompt_();
    if (!qcRaw) return;
    const qcParts = String(qcRaw).split("|");
    const qcCorto = String(qcParts[0] || "").trim().toUpperCase();
    const qcCompleto = String(qcParts.slice(1).join("|") || qcCorto).trim().toUpperCase();
  
    // Armar lista numerada para selección
    const maxMostrar = hijos.length;
    const lista = hijos.slice(0, maxMostrar).map((h, idx) => {
      const n = idx + 1;
      const nombreConjunto = String(h.codigoConjunto || "").trim() || "-";
      return `${n}) ${nombreConjunto}`;
    }).join("\n");
  
    const extra = "";
  
    const respSel = ui.prompt(
      "📦 ENTREGA SELECTIVA (PIEZAS)",
      "Escriba NÚMEROS o CÓDIGOS de conjunto separados por coma.\n" +
      "Ej: 1,3,4 o V90,V91\n\n" +
      "Piezas disponibles:\n\n" + lista + extra,
      ui.ButtonSet.OK_CANCEL
    );
    if (!respSel || respSel.getSelectedButton() !== ui.Button.OK) return;
  
    const txt = String(respSel.getResponseText() || "").trim();
    if (!txt) return;
  
    const tokens = txt.split(/[,\s]+/g).map(t => String(t || "").trim()).filter(Boolean);
    const filasFromInput = [];
    const tope = Math.min(hijos.length, maxMostrar);
    tokens.forEach(tok => {
      const n = parseInt(tok, 10);
      if (!isNaN(n) && n >= 1 && n <= tope) {
        filasFromInput.push(hijos[n - 1].row);
        return;
      }
      const tUp = tok.toUpperCase();
      const idx = hijos.findIndex(h => String(h.codigoConjunto || "").trim().toUpperCase() === tUp);
      if (idx >= 0 && idx < tope) filasFromInput.push(hijos[idx].row);
    });
  
    // Únicos
    const uniq = Array.from(new Set(filasFromInput));
    if (uniq.length === 0) {
      ui.alert(" ⛔  ERROR", "No se seleccionaron Piezas válidos.", ui.ButtonSet.OK);
      return;
    }
    const filasSeleccionadas = uniq.slice();
    const momento = ahora instanceof Date ? ahora : new Date();
  
    try {
      PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
  
      filasSeleccionadas.forEach(r => {
        hojaFabricacion.getRange(r, 7).setValue("ENTREGADO");
        hojaFabricacion.getRange(r, 10).setValue(momento).setNumberFormat("hh:mmam/pm dd/MM/yy");
        // QC: col 12 nombre completo, col 15 valor corto (validación)
        try { hojaFabricacion.getRange(r, 12).setValue(qcCompleto); } catch (e) { }
        try { hojaFabricacion.getRange(r, 14).setValue(qcCompleto); } catch (e) { }
        try { hojaFabricacion.getRange(r, 15).setValue(qcCorto); } catch (e) { }
        try { calcularTiempoFila(hojaFabricacion, r, momento); } catch (e) { }
        try { aplicarColoresEstadoFabricacion(hojaFabricacion, r, 1); } catch (e) { }
        try { sincronizarEstadoMadre(ss, hojaFabricacion, r, "Fabricación", momento, false, true); } catch (e) { }
        hijosMarcados++;
      });
    } catch (eWrite) {
      try { ss.toast("ERROR al marcar piezas: " + String(eWrite && eWrite.message ? eWrite.message : eWrite), "ESCARMETAL", 10); } catch (e2) { }
      throw eWrite;
    }
  
    SpreadsheetApp.flush();
  
    // Traspaso masivo a Remate (alertas UI dentro del helper si falla o no hay cambios)
    let resTraspaso = null;
    try {
      resTraspaso = traspasoRemateTrasEntregaSelectivaFabricacion_(ss, hojaFabricacion, filaMadre, momento);
      traspasoHecho = !!(resTraspaso && resTraspaso.ok);
    } catch (e) {
      try {
        ui.alert(" ⛔  TRASPASO", String(e && e.message ? e.message : e), ui.ButtonSet.OK);
      } catch (e2) { }
    }
  
    // Dashboard
    try { recalcularTotalDelDia(); } catch (e) { }
  
    try {
      const extra = resTraspaso && resTraspaso.motivo ? " (" + resTraspaso.motivo + ")" : "";
      ss.toast(
        "Entrega selectiva: " + hijosMarcados + " pieza(s). Remate: " + (traspasoHecho ? "OK" : "revisar") + extra,
        "ESCARMETAL",
        10
      );
    } catch (e) { }
    try {
      SpreadsheetApp.getUi().alert(" ✅  ENTREGA SELECTIVA", "Se marcaron " + hijosMarcados + " conjunto(s) como ENTREGADO.", SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (e) { }
  }
  
  function dejarEntregaSelectivaPendiente_(spreadsheetId, sheetName, filaMadre) {
    const payload = {
      spreadsheetId: String(spreadsheetId || ""),
      sheetName: String(sheetName || ""),
      filaMadre: parseInt(filaMadre, 10) || 0,
      ts: Date.now()
    };
    PropertiesService.getScriptProperties().setProperty("entregaSelectivaPendiente", JSON.stringify(payload));
  }
  
  function continuarEntregaSelectivaPendiente_() {
    const ui = SpreadsheetApp.getUi();
    const raw = PropertiesService.getScriptProperties().getProperty("entregaSelectivaPendiente");
    if (!raw) {
      ui.alert(" ℹ️  SIN PENDIENTE", "No hay entrega selectiva pendiente para continuar.", ui.ButtonSet.OK);
      return;
    }
    let payload = null;
    try { payload = JSON.parse(raw); } catch (e) { }
    if (!payload || !payload.sheetName || !payload.filaMadre) {
      PropertiesService.getScriptProperties().deleteProperty("entregaSelectivaPendiente");
      ui.alert(" ⛔  ERROR", "El pendiente de entrega selectiva está dañado. Se eliminó.", ui.ButtonSet.OK);
      return;
    }
    const ss = _abrirSsParaEntregaSelectiva_(payload.spreadsheetId);
    if (!ss) {
      ui.alert(" ⛔  ERROR", "No se pudo abrir el libro para continuar la entrega selectiva.", ui.ButtonSet.OK);
      return;
    }
    const hoja = ss.getSheetByName(payload.sheetName);
    if (!hoja) {
      ui.alert(" ⛔  ERROR", "No se encontró la hoja '" + payload.sheetName + "'.", ui.ButtonSet.OK);
      return;
    }
    PropertiesService.getScriptProperties().deleteProperty("entregaSelectivaPendiente");
    ejecutarEntregaSelectivaFabricacionPorPrompt_(ss, hoja, parseInt(payload.filaMadre, 10), new Date());
  }
  
  function mostrarDialogoEntregaSelectivaFabricacion_(spreadsheetId, sheetName, filaMadre) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    const hoja = ss.getSheetByName(sheetName);
    if (!hoja) return;
  
    const hijos = _obtenerHijosDisponiblesFabricacion_(hoja, filaMadre);
    if (!hijos || hijos.length === 0) {
      SpreadsheetApp.getUi().alert(" ℹ️  SIN PIEZAS DISPONIBLES", "No hay piezas disponibles para entregar (o ya están entregados).", SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
  
    const token = Utilities.getUuid();
    const propKeyFab = "entregaSelectivaFab:" + token;
    const payload = {
      spreadsheetId: ss.getId(),
      sheetName,
      filaMadre,
      ts: Date.now()
    };
    PropertiesService.getScriptProperties().setProperty(propKeyFab, JSON.stringify(payload));
  
    const titulo = "Seleccionar hijos a ENTREGAR (Fabricación)";
    const qcOptions = [
      "ALAN GONZALEZ",
      "FRANCISCO SAN MARTIN",
      "LUIS ULLOA",
      "VICTOR LEIVA"
    ];
  
    const escapeHtml = (s) => String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  
    const rowsHtml = hijos.map(h => {
      const label = `Fila ${h.row} — Conjunto: ${escapeHtml(h.codigoConjunto)} — Cant: ${escapeHtml(h.cantidad)} — Kg: ${escapeHtml(h.pesoTotal)} — Estado: ${escapeHtml(h.estado)}`;
      return `<label class="item"><input type="checkbox" class="chk" value="${h.row}"> <span>${label}</span></label>`;
    }).join("\n");
  
    const qcHtml = qcOptions.map(q => `<option value="${escapeHtml(q)}">${escapeHtml(q)}</option>`).join("");
  
    const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <base target="_top">
      <style>
        body { font-family: Arial, sans-serif; padding: 12px; }
        .muted { color: #555; font-size: 12px; }
        .box { border: 1px solid #ddd; border-radius: 8px; padding: 10px; max-height: 340px; overflow: auto; }
        .item { display: block; padding: 6px 4px; border-bottom: 1px solid #eee; }
        .item:last-child { border-bottom: none; }
        .row { margin: 10px 0; }
        select, button { padding: 8px; font-size: 13px; }
        .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }
        .err { color: #b00020; font-size: 12px; display:none; }
      </style>
    </head>
    <body>
      <div class="muted">Seleccione los hijos que pasarán a <b>ENTREGADO</b> y asigne <b>QC</b> (obligatorio).</div>
  
      <div class="row">
        <label><b>Encargado de Calidad (QC)</b></label><br/>
        <select id="qc">
          <option value="">-- Seleccionar --</option>
          ${qcHtml}
        </select>
        <div id="errQc" class="err">Debe seleccionar QC.</div>
      </div>
  
      <div class="row">
        <div class="box">
          ${rowsHtml}
        </div>
        <div id="errSel" class="err">Debe seleccionar al menos un hijo.</div>
      </div>
  
      <div class="actions">
        <button onclick="seleccionarTodo()">Seleccionar todos</button>
        <button onclick="limpiar()">Limpiar</button>
        <button onclick="confirmar()" style="font-weight:bold;">Confirmar entrega</button>
      </div>
  
      <script>
        const token = ${JSON.stringify(token)};
        function seleccionarTodo() {
          document.querySelectorAll('.chk').forEach(c => c.checked = true);
        }
        function limpiar() {
          document.querySelectorAll('.chk').forEach(c => c.checked = false);
          document.getElementById('qc').value = '';
        }
        function confirmar() {
          const qc = (document.getElementById('qc').value || '').trim();
          const selected = Array.from(document.querySelectorAll('.chk'))
            .filter(c => c.checked)
            .map(c => parseInt(c.value, 10))
            .filter(n => !isNaN(n));
  
          const errQc = document.getElementById('errQc');
          const errSel = document.getElementById('errSel');
          errQc.style.display = qc ? 'none' : 'block';
          errSel.style.display = selected.length ? 'none' : 'block';
          if (!qc || !selected.length) return;
  
          google.script.run
            .withSuccessHandler(() => { google.script.host.close(); })
            .withFailureHandler((e) => { alert('Error: ' + (e && e.message ? e.message : e)); })
            .aplicarEntregaSelectivaHijosFabricacion_(token, selected, qc);
        }
      </script>
    </body>
  </html>`;
  
    const output = HtmlService.createHtmlOutput(html).setWidth(720).setHeight(560);
    try {
      SpreadsheetApp.getUi().showModalDialog(output, titulo);
    } catch (eModal) {
      // Fallback compatible sin permisos extra de UI.
      try { PropertiesService.getScriptProperties().deleteProperty(propKeyFab); } catch (eDel) { }
      ejecutarEntregaSelectivaFabricacionPorPrompt_(ss, hoja, filaMadre, new Date());
    }
  }
  
  function aplicarEntregaSelectivaHijosFabricacion_(token, filasSeleccionadas, qcNombre) {
    const key = "entregaSelectivaFab:" + String(token || "");
    const raw = PropertiesService.getScriptProperties().getProperty(key);
    if (!raw) throw new Error("Token de entrega selectiva no encontrado o expirado.");
  
    let payload = null;
    try { payload = JSON.parse(raw); } catch (e) { }
    PropertiesService.getScriptProperties().deleteProperty(key);
  
    if (!payload || !payload.sheetName || !payload.filaMadre) {
      throw new Error("Contexto inválido para entrega selectiva.");
    }
    if (payload.ts && (Date.now() - payload.ts) > (15 * 60 * 1000)) {
      throw new Error("La selección expiró (más de 15 min). Intente nuevamente.");
    }
  
    const qc = String(qcNombre || "").trim();
    if (!qc) throw new Error("QC es obligatorio.");
  
    const ss = _abrirSsParaEntregaSelectiva_(payload.spreadsheetId);
    if (!ss) throw new Error("No se pudo abrir el libro de cálculo.");
    const hoja = ss.getSheetByName(payload.sheetName);
    if (!hoja) throw new Error("Hoja no encontrada.");
  
    const filaMadre = parseInt(payload.filaMadre, 10);
    if (isNaN(filaMadre) || filaMadre < 2) throw new Error("Fila conjunto inválida.");
  
    const hijosDisponibles = _obtenerHijosDisponiblesFabricacion_(hoja, filaMadre);
    const setDisponibles = new Set(hijosDisponibles.map(h => h.row));
  
    const filas = (Array.isArray(filasSeleccionadas) ? filasSeleccionadas : [])
      .map(n => parseInt(n, 10))
      .filter(n => !isNaN(n) && setDisponibles.has(n));
  
    if (filas.length === 0) {
      throw new Error("La selección no contiene piezas válidas para entregar. Vuelva a seleccionar y confirme.");
    }
  
    const ahora = new Date();
    PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
  
    // Marcar hijos seleccionados como ENTREGADO + QC + fecha fin + tiempos
    filas.forEach(r => {
      hoja.getRange(r, 7).setValue("ENTREGADO");
      hoja.getRange(r, 10).setValue(ahora).setNumberFormat("hh:mmam/pm dd/MM/yy");
      // En el script existen varias columnas usadas para QC según flujo; para consistencia, llenamos las más usadas.
      try { hoja.getRange(r, 12).setValue(qc); } catch (e) { } // col L (usada en rechazos / lote)
      try { hoja.getRange(r, 14).setValue(qc); } catch (e) { } // col N (usada en ENTREGADO individual)
      try { hoja.getRange(r, 15).setValue(qc); } catch (e) { } // col O (validación)
      try { calcularTiempoFila(hoja, r, ahora); } catch (e) { }
      try { aplicarColoresEstadoFabricacion(hoja, r, 1); } catch (e) { }
      try { sincronizarEstadoMadre(ss, hoja, r, "Fabricación", ahora, false, true); } catch (e) { }
    });
  
    SpreadsheetApp.flush();
  
    try {
      traspasoRemateTrasEntregaSelectivaFabricacion_(ss, hoja, filaMadre, ahora);
    } catch (e) {
      try {
        SpreadsheetApp.getUi().alert(" ⛔  ENTREGA SELECTIVA", String(e && e.message ? e.message : e), SpreadsheetApp.getUi().ButtonSet.OK);
      } catch (e2) { }
    }
  
    // Dashboard
    try { recalcularTotalDelDia(); } catch (e) { }
  }

  function _obtenerBloqueHijosPorFila_(hoja, filaCualquieraDelBloque) {
    if (!hoja || !filaCualquieraDelBloque) return null;
    const datos = hoja.getDataRange().getValues();
    const colores = hoja.getRange(1, 1, Math.max(datos.length, 1), 1).getFontColors();

    let idxMadre = filaCualquieraDelBloque - 1;
    while (idxMadre >= 1 && colores[idxMadre] && colores[idxMadre][0] === "#999999") idxMadre--;
    if (idxMadre < 1) return null;

    const filaMadre = idxMadre + 1;
    const codigoPlan = String(datos[idxMadre][0] || "").trim();
    if (!codigoPlan) return null;

    const hijos = [];
    for (let i = idxMadre + 1; i < datos.length; i++) {
      if (!colores[i] || colores[i][0] !== "#999999") break;
      if (String(datos[i][0] || "").trim() !== codigoPlan) break;
      hijos.push({
        row: i + 1,
        codigoConjunto: String(datos[i][1] || "").trim(),
        estado: String(datos[i][6] || "").trim().toUpperCase()
      });
    }
    return { filaMadre, codigoPlan, hijos };
  }

  function ejecutarEntregaSelectivaRemateDesdeHijoPorPrompt_(ss, hojaRemate, filaHijoActual, ahora, oldValue) {
    const ui = SpreadsheetApp.getUi();
    const bloque = _obtenerBloqueHijosPorFila_(hojaRemate, filaHijoActual);
    if (!bloque || !bloque.hijos || bloque.hijos.length === 0) return;

    const disponibles = bloque.hijos.filter(h => h.estado !== "ENTREGADO");
    if (disponibles.length === 0) {
      PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
      hojaRemate.getRange(filaHijoActual, 7).setValue(oldValue || "EN REMATE");
      return;
    }

    const propsQCRem = PropertiesService.getScriptProperties();
    const QC_CACHE_KEY_REM = "cacheQCRemateSelectiva";
    let qc = String(propsQCRem.getProperty(QC_CACHE_KEY_REM) || "").trim().toUpperCase();
    if (!qc) {
      const firma = solicitarQCRemateSelectivaPorPrompt_("✅ REMATE - CONTROL DE CALIDAD");
      if (!firma) {
        PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
        hojaRemate.getRange(filaHijoActual, 7).setValue(oldValue || "EN REMATE");
        return;
      }
      qc = String(firma).trim().toUpperCase();
      propsQCRem.setProperty(QC_CACHE_KEY_REM, qc);
    }

    let operario = String(hojaRemate.getRange(filaHijoActual, 10).getValue() || "").trim().toUpperCase();
    if (!operario) {
      const respOp = ui.prompt(" 👷  REMATE - OPERARIO A CARGO", "Indique quién fue el operario a cargo del proceso de remate:", ui.ButtonSet.OK_CANCEL);
      if (respOp.getSelectedButton() != ui.Button.OK || !respOp.getResponseText().trim()) {
        PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
        hojaRemate.getRange(filaHijoActual, 7).setValue(oldValue || "EN REMATE");
        return;
      }
      operario = respOp.getResponseText().trim().toUpperCase();
    }

    const lista = disponibles.map((h, i) => `${i + 1}) ${h.codigoConjunto || "-"}`).join("\n");
    const respSel = ui.prompt(
      "📦 ENTREGA SELECTIVA (REMATE)",
      "Escriba NÚMEROS o CÓDIGOS de conjunto separados por coma.\n" +
      "Ej: 1,3,4 o V90,V91\n\n" +
      "Piezas disponibles:\n\n" + lista,
      ui.ButtonSet.OK_CANCEL
    );
    if (!respSel || respSel.getSelectedButton() !== ui.Button.OK) {
      PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
      hojaRemate.getRange(filaHijoActual, 7).setValue(oldValue || "EN REMATE");
      return;
    }

    const txt = String(respSel.getResponseText() || "").trim();
    if (!txt) {
      PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
      hojaRemate.getRange(filaHijoActual, 7).setValue(oldValue || "EN REMATE");
      return;
    }

    const tokens = txt.split(/[,\s]+/g).map(t => String(t || "").trim()).filter(Boolean);
    const filas = [];
    tokens.forEach(tok => {
      const n = parseInt(tok, 10);
      if (!isNaN(n) && n >= 1 && n <= disponibles.length) {
        filas.push(disponibles[n - 1].row);
        return;
      }
      const up = tok.toUpperCase();
      const idx = disponibles.findIndex(h => String(h.codigoConjunto || "").trim().toUpperCase() === up);
      if (idx >= 0) filas.push(disponibles[idx].row);
    });
    const uniq = Array.from(new Set(filas));
    if (uniq.length === 0) {
      PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
      hojaRemate.getRange(filaHijoActual, 7).setValue(oldValue || "EN REMATE");
      return;
    }

    const momento = ahora instanceof Date ? ahora : new Date();
    PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
    uniq.forEach(r => {
      hojaRemate.getRange(r, 7).setValue("ENTREGADO");
      hojaRemate.getRange(r, 9).setValue(momento).setNumberFormat("hh:mmam/pm dd/MM/yy");
      hojaRemate.getRange(r, 11).setValue(qc);
      hojaRemate.getRange(r, 10).setValue(operario);
      try { calcularTiempoRemate(hojaRemate, r, momento); } catch (e) { }
      try { aplicarColoresEstadoRemate(hojaRemate, r, 1); } catch (e) { }
      try { sincronizarEstadoMadre(ss, hojaRemate, r, "Remate", momento, false, false); } catch (e) { }
    });
    SpreadsheetApp.flush();

    try {
      const hojaLimpieza = ss.getSheetByName("Limpieza");
      if (hojaLimpieza) traspasoMasivoRemate(hojaRemate, hojaLimpieza, bloque.filaMadre, momento);
    } catch (e) { }
  }

  function ejecutarEntregaSelectivaLimpiezaDesdeHijoPorPrompt_(ss, hojaLimpieza, filaHijoActual, ahora, oldValue) {
    const ui = SpreadsheetApp.getUi();
    const bloque = _obtenerBloqueHijosPorFila_(hojaLimpieza, filaHijoActual);
    if (!bloque || !bloque.hijos || bloque.hijos.length === 0) return;

    const disponibles = bloque.hijos.filter(h => h.estado !== "ENTREGADO");
    if (disponibles.length === 0) {
      PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
      hojaLimpieza.getRange(filaHijoActual, 7).setValue(oldValue || "EN LIMPIEZA");
      return;
    }

    const propsQCLimp = PropertiesService.getScriptProperties();
    const QC_CACHE_KEY_LIMP = "cacheQCLimpiezaSelectiva";
    let qc = String(propsQCLimp.getProperty(QC_CACHE_KEY_LIMP) || "").trim().toUpperCase();
    if (!qc) {
      const firma = solicitarQCRemateSelectivaPorPrompt_("✅ LIMPIEZA - CONTROL DE CALIDAD");
      if (!firma) {
        PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
        hojaLimpieza.getRange(filaHijoActual, 7).setValue(oldValue || "EN LIMPIEZA");
        return;
      }
      qc = String(firma).trim().toUpperCase();
      propsQCLimp.setProperty(QC_CACHE_KEY_LIMP, qc);
    }

    let operario = String(hojaLimpieza.getRange(filaHijoActual, 10).getValue() || "").trim().toUpperCase();
    if (!operario) {
      const respOp = ui.prompt(" 👷  LIMPIEZA - OPERARIO A CARGO", "Indique quién fue el operario a cargo del proceso de limpieza:", ui.ButtonSet.OK_CANCEL);
      if (respOp.getSelectedButton() != ui.Button.OK || !respOp.getResponseText().trim()) {
        PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
        hojaLimpieza.getRange(filaHijoActual, 7).setValue(oldValue || "EN LIMPIEZA");
        return;
      }
      operario = respOp.getResponseText().trim().toUpperCase();
    }

    const lista = disponibles.map((h, i) => `${i + 1}) ${h.codigoConjunto || "-"}`).join("\n");
    const respSel = ui.prompt(
      "📦 ENTREGA SELECTIVA (LIMPIEZA)",
      "Escriba NÚMEROS o CÓDIGOS de conjunto separados por coma.\n" +
      "Ej: 1,3,4 o V90,V91\n\n" +
      "Piezas disponibles:\n\n" + lista,
      ui.ButtonSet.OK_CANCEL
    );
    if (!respSel || respSel.getSelectedButton() !== ui.Button.OK) {
      PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
      hojaLimpieza.getRange(filaHijoActual, 7).setValue(oldValue || "EN LIMPIEZA");
      return;
    }

    const txt = String(respSel.getResponseText() || "").trim();
    if (!txt) {
      PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
      hojaLimpieza.getRange(filaHijoActual, 7).setValue(oldValue || "EN LIMPIEZA");
      return;
    }

    const tokens = txt.split(/[,\s]+/g).map(t => String(t || "").trim()).filter(Boolean);
    const filas = [];
    tokens.forEach(tok => {
      const n = parseInt(tok, 10);
      if (!isNaN(n) && n >= 1 && n <= disponibles.length) {
        filas.push(disponibles[n - 1].row);
        return;
      }
      const up = tok.toUpperCase();
      const idx = disponibles.findIndex(h => String(h.codigoConjunto || "").trim().toUpperCase() === up);
      if (idx >= 0) filas.push(disponibles[idx].row);
    });
    const uniq = Array.from(new Set(filas));
    if (uniq.length === 0) {
      PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
      hojaLimpieza.getRange(filaHijoActual, 7).setValue(oldValue || "EN LIMPIEZA");
      return;
    }

    const momento = ahora instanceof Date ? ahora : new Date();
    PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(Date.now()));
    uniq.forEach(r => {
      hojaLimpieza.getRange(r, 7).setValue("ENTREGADO");
      hojaLimpieza.getRange(r, 9).setValue(momento).setNumberFormat("hh:mmam/pm dd/MM/yy");
      hojaLimpieza.getRange(r, 11).setValue(qc);
      hojaLimpieza.getRange(r, 10).setValue(operario);
      try { calcularTiempoLimpieza(hojaLimpieza, r, momento); } catch (e) { }
      try { aplicarColoresEstadoLimpieza(hojaLimpieza, r, 1); } catch (e) { }
      try { sincronizarEstadoMadre(ss, hojaLimpieza, r, "Limpieza", momento, false, false); } catch (e) { }
    });
    SpreadsheetApp.flush();
  }

  function solicitarQCRemateSelectivaPorPrompt_(titulo) {
    const ui = SpreadsheetApp.getUi();
    const msg = "Seleccione Encargado de Calidad (OBLIGATORIO):\n\n" +
      "1 - ALAN GONZALEZ\n" +
      "2 - FRANCISCO SAN MARTÍN\n" +
      "3 - LUIS ULLOA\n" +
      "4 - VICTOR LEIVA\n\n" +
      "Ingrese SOLO el número";
    const resp = ui.prompt(titulo || "✅ CONTROL DE CALIDAD", msg, ui.ButtonSet.OK_CANCEL);
    if (!resp || resp.getSelectedButton() !== ui.Button.OK) return null;
    const txt = String(resp.getResponseText() || "").trim();
    if (txt === "1") return "ALAN GONZALEZ";
    if (txt === "2") return "FRANCISCO SAN MARTÍN";
    if (txt === "3") return "LUIS ULLOA";
    if (txt === "4") return "VICTOR LEIVA";
    ui.alert(" ⛔  ERROR DE SELECCIÓN", "Entrada no válida. Solo se permite '1', '2', '3' o '4'.", ui.ButtonSet.OK);
    return null;
  }
  
  // -----------------------------------------------------------
  // UTILIDADES Y FUNCIONES LÓGICAS (MATH TIEMPO)
  // -----------------------------------------------------------
  
  function actualizarValidacionesFabricacion() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName("Fabricación");
    if (!hoja) return;
    const ultFila = Math.max(hoja.getLastRow(), 2);
  
    // 1. ESTADOS (Columna H - 8) - incluimos "ENTREGA PARCIAL" como acción y "PARCIAL" como estado intermedio
    // Se reemplaza RECHAZADO por ENTREGA CON OBSERVACION (entrega + registro en Log_Calidad).
    const estados = ['BAJADA', 'FABRICANDO', 'ENTREGA PARCIAL', 'PARCIAL', 'ENTREGADO', 'ENTREGA CON OBSERVACION'];
    const reglaEstado = SpreadsheetApp.newDataValidation().requireValueInList(estados, true).setAllowInvalid(false).build();
    hoja.getRange(2, 8, ultFila - 1, 1).setDataValidation(reglaEstado);
  
    // 2. CONTROL DE CALIDAD (Columna O - 15)
    // Debe ser coherente con los nombres usados en los prompts y con lo que se escribe en la hoja.
    const listaQCFab = ['ALAN GONZALEZ', 'FRANCISCO SAN MARTIN', 'LUIS ULLOA', 'VICTOR LEIVA'];
    const reglaQC = SpreadsheetApp.newDataValidation().requireValueInList(listaQCFab, true).setAllowInvalid(false).build();
    hoja.getRange(2, 15, ultFila - 1, 1).setDataValidation(reglaQC);
  
    SpreadsheetApp.getUi().alert(" ✅   ÉXITO", "Menús desplegables (Estados y QC) actualizados.", SpreadsheetApp.getUi().ButtonSet.OK);
  }
  
  function registrarRechazoEnLog(ss, hojaFab, fila, fecha, motivo, qc, detalle, tipoAgrupacion) {
    const hojaLog = ss.getSheetByName("Log_Calidad");
    if (!hojaLog) return;
    const codigoPlan = hojaFab.getRange(fila, 1).getValue();
    const codigoConjunto = hojaFab.getRange(fila, 2).getValue();
    const operario = hojaFab.getRange(fila, 11).getValue(); // Columna K = encargado de fabricar
    
    // Si no se proporciona tipoAgrupacion, determinarlo automáticamente
    if (!tipoAgrupacion) {
      const colorFila = hojaFab.getRange(fila, 1).getFontColor();
      tipoAgrupacion = (colorFila === "#999999") ? "HIJO" : "MADRE";
    }
  
    hojaLog.insertRowBefore(2);
    // Agregar tipoAgrupacion en la columna 9 (índice 8)
    hojaLog.getRange(2, 1, 1, 9).setValues([[fecha, codigoPlan, codigoConjunto, operario, qc, motivo, detalle, "", tipoAgrupacion]]);
  }
  
  function registrarEntregaConObservacionEnLog(ss, hojaFab, fila, fecha, motivo, qc, detalle, tiempoPerdido, tipoAgrupacion) {
    const hojaLog = ss.getSheetByName("Log_Calidad");
    if (!hojaLog) return;
    const codigoPlan = hojaFab.getRange(fila, 1).getValue();
    const codigoConjunto = hojaFab.getRange(fila, 2).getValue();
    const operario = hojaFab.getRange(fila, 11).getValue(); // Columna K = encargado de fabricar
  
    if (!tipoAgrupacion) {
      const colorFila = hojaFab.getRange(fila, 1).getFontColor();
      tipoAgrupacion = (colorFila === "#999999") ? "HIJO" : "MADRE";
    }
  
    hojaLog.insertRowBefore(2);
    // Mantener compatibilidad con el log existente y añadir una columna extra para tiempo perdido (col 10).
    hojaLog.getRange(2, 1, 1, 10).setValues([[
      fecha,
      codigoPlan,
      codigoConjunto,
      operario,
      qc,
      "ENTREGA CON OBSERVACION - " + motivo,
      detalle,
      "",
      tipoAgrupacion,
      tiempoPerdido
    ]]);
  }
  
  function cerrarCicloReparacionEnLog(ss, hojaFab, fila, ahora) {
    const hojaLog = ss.getSheetByName("Log_Calidad");
    if (!hojaLog) return;
    const codigoPlan = String(hojaFab.getRange(fila, 1).getValue()).trim();
    const codigoConjunto = String(hojaFab.getRange(fila, 2).getValue()).trim();
  
    const lastRow = hojaLog.getLastRow();
    if (lastRow < 2) return;
    const datosLog = hojaLog.getRange(2, 1, lastRow - 1, 8).getValues();
  
    for (let i = datosLog.length - 1; i >= 0; i--) {
      const rowPlan = String(datosLog[i][1]).trim();
      const rowConj = String(datosLog[i][2]).trim();
      const fechaFin = datosLog[i][7];
  
      if (rowPlan === codigoPlan && rowConj === codigoConjunto && String(fechaFin) === "") {
        const fechaInicio = convertirTextoAFecha(datosLog[i][0]);
        const filaRealEnLog = i + 2;
  
        hojaLog.getRange(filaRealEnLog, 8).setValue(ahora).setNumberFormat("hh:mmam/pm dd/MM/yy");
  
        if (fechaInicio) {
          // === CÁLCULO DE TIEMPO HÁBIL PARA EL LOG ===
          const totalMinutos = calcularMinutosHabiles(fechaInicio, ahora);
          let textoTiempo = "";
  
          if (totalMinutos >= 60) {
            const h = Math.floor(totalMinutos / 60);
            const m = totalMinutos % 60;
            textoTiempo = h + "h " + m + "m";
          } else {
            textoTiempo = totalMinutos + " min";
          }
  
          hojaLog.getRange(filaRealEnLog, 9).setValue(textoTiempo);
        }
        break;
      }
    }
  }
  
  function cascadaEstadoMasivo(hoja, filaMadre, ahora, estadoNuevo, encargado, encargadoCalidad) {
    const maxRows = hoja.getLastRow();
    const rangoPosiblesHijos = hoja.getRange(filaMadre + 1, 1, maxRows - filaMadre, 1);
    const colores = rangoPosiblesHijos.getFontColors();
  
    let filasHijos = 0;
    for (let i = 0; i < colores.length; i++) {
      if (colores[i][0] !== '#999999') break;
      filasHijos++;
    }
  
    if (filasHijos > 0) {
      hoja.getRange(filaMadre + 1, 7, filasHijos, 1).setValue(estadoNuevo);
      if (estadoNuevo === "FABRICANDO") {
        // Misma fecha de inicio (col 9) que la madre para todos los hijos
        hoja.getRange(filaMadre + 1, 9, filasHijos, 1).setValue(ahora).setNumberFormat("hh:mmam/pm dd/MM/yy");
        hoja.getRange(filaMadre + 1, 11, filasHijos, 1).setValue("");
        if (encargado) hoja.getRange(filaMadre + 1, 11, filasHijos, 1).setValue(encargado);
      } else if (estadoNuevo === "ENTREGADO") {
        // En Fabricación: columna 10 = fecha de fin (se establece cuando pasa a ENTREGADO)
        // Verificar si es hoja de Fabricación para usar la columna correcta
        const esFabricacion = hoja.getName() === 'Fabricación';
        if (esFabricacion) {
          hoja.getRange(filaMadre + 1, 10, filasHijos, 1).setValue(ahora).setNumberFormat("hh:mmam/pm dd/MM/yy");
        } else {
          // Para otras hojas (Técnica, Remate, etc.) usar columna 9
          hoja.getRange(filaMadre + 1, 9, filasHijos, 1).setValue(ahora).setNumberFormat("hh:mmam/pm dd/MM/yy");
        }
        if (encargadoCalidad) hoja.getRange(filaMadre + 1, 14, filasHijos, 1).setValue(encargadoCalidad);
        for (let k = 0; k < filasHijos; k++) {
          cerrarCicloReparacionEnLog(hoja.getParent(), hoja, filaMadre + 1 + k, ahora);
        }
      }
    }
  }
  
  // >>> NUEVA VERSIÓN QUE RECIBE "nombreEncargado" <<<
  function procesarIngresoTecnicaTop(hoja, codigoMadre, ahora, ss, nombreEncargado) {
    const hBase = ss.getSheetByName("BaseDespiece");
    if (!hBase) return;
    const db = hBase.getDataRange().getValues();
    const partes = db.filter(r => String(r[0]).trim().toUpperCase() === codigoMadre);
  
    let pesoTotalMadre = 0;
    if (partes.length > 0) {
      pesoTotalMadre = partes.reduce((acumulador, fila) => acumulador + (parseFloat(fila[4]) || 0), 0);
      pesoTotalMadre = Math.round(pesoTotalMadre * 100) / 100;
    }
    const descMadre = determinarDescripcionTecnica(codigoMadre);
  
    // AQUI INSERTAMOS EL NOMBRE EN LA COLUMNA J (Index 9)
    let filaMadre = [codigoMadre, "", "", "", pesoTotalMadre, descMadre, "IMPRESO", ahora, "", nombreEncargado, "", ""];
  
    let filasHijos = [];
    if (partes.length > 0) {
      // TAMBIÉN A LOS HIJOS (Opcional, pero recomendable para consistencia visual)
      filasHijos = partes.map(p => [
        codigoMadre, String(p[1]).trim(), p[2] || 0, p[3] || 0, p[4] || 0, "", "IMPRESO", ahora, "", nombreEncargado, "", ""
      ]);
    }
    const totalFilas = 1 + filasHijos.length;
    hoja.insertRows(3, totalFilas);
    const rangoMadre = hoja.getRange(3, 1, 1, 12);
    rangoMadre.setValues([filaMadre]);
    rangoMadre.setFontColor("#000000").setFontWeight("bold");
  
    if (filasHijos.length > 0) {
      const rangoHijos = hoja.getRange(4, 1, filasHijos.length, 12);
      rangoHijos.setValues(filasHijos);
      hoja.getRange(4, 1, filasHijos.length, 1).setFontColor("#999999").setFontWeight("normal");
      hoja.getRange(4, 2, filasHijos.length, 11).setFontColor("#000000").setFontWeight("bold");
      hoja.getRange(4, 1, filasHijos.length, 1).shiftRowGroupDepth(1);
      hoja.getRowGroup(4, 1).collapse();
    }
    const reglaMenu = SpreadsheetApp.newDataValidation().requireValueInList(['IMPRESO', 'ENTREGADO'], true).setAllowInvalid(false).build();
    hoja.getRange(3, 7, totalFilas, 1).setDataValidation(reglaMenu);
  }
  
  function determinarDescripcionTecnica(codigo) {
    const partes = String(codigo || "").trim().split(/\s+/);
    const tipo = partes.length >= 2 ? partes[1] : partes[0] || "";
    if (tipo.includes("VEM")) return "VIGA ENREJADA";
    if (tipo.includes("RV")) return "RIOSTRA VERTICAL";
    if (tipo.includes("MR")) return "MARCO";
    if (tipo.includes("RH")) return "RIOSTRA HORIZONTAL";
    if (tipo.includes("RL")) return "RIOSTRA LATERAL";
    if (tipo.includes("RT")) return "RIOSTRA TECHO";
    if (tipo.includes("XT")) return "COLGADOR TECHO";
    if (tipo.includes("XM")) return "COLGADOR MARQUESINA";
    if (tipo.includes("AG")) return "ANGULO AG";
    if (tipo.includes("FR")) return "FRONTON";
    if (tipo.includes("LE")) return "LIMON";
    if (tipo.includes("TP")) return "TAPACAN";
    if (tipo.includes("SP")) return "SOPORTE";
    if (tipo.includes("PL")) return "PLANCHAS";
    if (tipo.includes("XL")) return "COLGADOR LATERAL";
    if (tipo.includes("AB")) return "ANGULO DE BORDE";
    if (tipo.includes("CE")) return "CERCHAS";
    if (tipo.includes("NP")) return "COSTANERA PUNTAL";
    if (tipo.includes("KA")) return "CARTELA";
    if (tipo.includes("VE")) return "VIGA ENREJADA";
    if (tipo.includes("DT")) return "DINTEL";
    if (tipo.includes("PD")) return "PELDAÑOS";
    if (tipo.includes("PLE")) return "PUNTAL LIMON";
    if (tipo.includes("PU")) return "PUNTAL";
    if (tipo.includes("CA")) return "COLUMNA ALTILLO";
    if (tipo.includes("VA")) return "VIGA ALTILLO";
    if (tipo.includes("RAL")) return "RIOSTRA ALTILLO";
    if (tipo.includes("JA")) return "JAMBA";
    if (tipo.includes("SL")) return "SOPORTE LETRERO";
    if (tipo.includes("TS")) return "TENSOR";
    if (tipo.includes("PT")) return "PLATAFORMA";
    if (tipo.includes("PV")) return "PILAR VIENTO";
    if (tipo.includes("VP")) return "VIGA PORTON";
    if (tipo.includes("BY")) return "BAYONETA";
    if (tipo.includes("EM")) return "PLANCHA DE MONTAJE";
    if (tipo.includes("C")) return "COLUMNA";
    if (tipo.includes("V")) return "VIGA V";
    if (tipo.includes("I")) return "INSERTOS";
    if (tipo.includes("D")) return "DIAGONALES";
    if (tipo.includes("N")) return "COSTANERA TECHO";
    if (tipo.includes("L")) return "LIMON";
    return "-";
  }
  
  function ejecutarAccionesEntregado(ss, hoja, fila, nombreHoja, ahora, opciones) {
    if (nombreHoja === 'Fabricación') {
      if (String(hoja.getRange(fila, 11).getValue()).trim() === "") {
        hoja.getRange(fila, 11).setValue(ahora).setNumberFormat("hh:mmam/pm dd/MM/yy");
      }
    } else {
      hoja.getRange(fila, 9).setValue(ahora).setNumberFormat("hh:mmam/pm dd/MM/yy");
      if (nombreHoja === 'Técnica') {
        try {
          const inicioVal = hoja.getRange(fila, 8).getValue();
          const inicioFecha = convertirTextoAFecha(inicioVal);
          if (inicioFecha) {
            const diff = ahora.getTime() - inicioFecha.getTime();
            const minutos = Math.max(0, Math.floor(diff / 60000));
            const horas = Math.floor(minutos / 60);
            const minRest = minutos % 60;
            hoja.getRange(fila, 12).setValue(horas + (minRest / 100)).setNumberFormat("0.00");
          }
        } catch (eTec) { }
      }
      if (nombreHoja === 'Remate') {
        try { calcularTiempoRemate(hoja, fila, ahora); } catch (eRem) { }
      }
      if (nombreHoja === 'Limpieza') {
        try { calcularTiempoLimpieza(hoja, fila, ahora); } catch (eLimp) { }
      }
      if (nombreHoja === 'Técnica') {
        // Refrescar bandera para que cualquier onEdit disparado por los setValue siguientes no pida firma de nuevo
        PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(new Date().getTime()));
        // IMPORTANTE: escritura en bloque para evitar cortar con +100 hijos (límite de tiempo onEdit)
        const maxRows = hoja.getLastRow();
        const codigoBase = String(hoja.getRange(fila, 1).getValue() || "").trim();
        if (codigoBase) {
          // Si se entregó un hijo, subir hasta la madre para cubrir TODO el bloque del conjunto
          let filaMadre = fila;
          try {
            while (filaMadre > 1 && hoja.getRange(filaMadre, 1).getFontColor() === "#999999") filaMadre--;
          } catch (eUp) { }
          const codigoMadre = String(hoja.getRange(filaMadre, 1).getValue() || "").trim();
          const codigoObjetivo = codigoMadre || codigoBase;
  
          const start = filaMadre + 1;
          if (start <= maxRows) {
            const max = maxRows - start + 1;
            const colores = hoja.getRange(start, 1, max, 1).getFontColors();
            const codigos = hoja.getRange(start, 1, max, 1).getValues();
  
            let n = 0;
            for (let i = 0; i < max; i++) {
              if (!colores[i] || colores[i][0] !== "#999999") break;
              if (String(codigos[i][0] || "").trim() !== codigoObjetivo) break;
              n++;
            }
  
            if (n > 0) {
              const estados = new Array(n).fill(0).map(_ => ["ENTREGADO"]);
              const fechas = new Array(n).fill(0).map(_ => [ahora]);
              hoja.getRange(start, 7, n, 1).setValues(estados);
              hoja.getRange(start, 9, n, 1).setValues(fechas).setNumberFormat("hh:mmam/pm dd/MM/yy");
            }
          }
        }
      }
    }
    SpreadsheetApp.flush();
    if (opciones && opciones.skipTraspaso) return;
    const flujo = ['Técnica', 'Fabricación', 'Remate', 'Limpieza'];
    const idx = flujo.indexOf(nombreHoja);
    const lock = LockService.getScriptLock();
    // waitLock: si otra ejecución está drenando la cola Técnica o traspasando, no omitir el traspaso
    // (tryLock fallaba y la planificación quedaba sin pasar a Fabricación).
    try {
      lock.waitLock(60000);
    } catch (eLock) {
      return;
    }
    try {
      if (idx !== -1 && idx < flujo.length - 1) {
        const nombreDestino = flujo[idx + 1];
        const hojaDestino = ss.getSheetByName(nombreDestino);
        if (hojaDestino) {
        if (nombreHoja === 'Técnica') traspasoMasivoTecnica(hoja, hojaDestino, fila, ahora, (opciones && opciones.operarioFabricacion) ? String(opciones.operarioFabricacion).trim().toUpperCase() : "");
          if (nombreHoja === 'Fabricación') traspasoMasivoFabricacion(hoja, hojaDestino, fila, ahora);
          if (nombreHoja === 'Remate') traspasoMasivoRemate(hoja, hojaDestino, fila, ahora);
        }
      }
    } finally {
      try { lock.releaseLock(); } catch (eRel) { }
    }
  }
  
  function traspasoMasivoTecnica(hojaOrigen, hojaDestino, filaActiva, ahora, operarioFabricacion) {
    const codigoPrincipal = String(hojaOrigen.getRange(filaActiva, 1).getValue()).trim();
    if (!codigoPrincipal) return;
  
    // Evitar doble traspaso: si este mismo código se traspasó hace menos de 6 s, no insertar de nuevo
    const TRASPASO_TEC_KEY = "traspasoTecnicaUltimo";
    const TRASPASO_TEC_MS = 6000;
    const props = PropertiesService.getScriptProperties();
    const ultimo = props.getProperty(TRASPASO_TEC_KEY) || "";
    const parts = ultimo.split("|");
    const ultimoTs = parts[0] || "0";
    const ultimoCodigo = parts[1] || "";
    const t = parseInt(ultimoTs, 10);
    if (ultimoCodigo && ultimoCodigo.toUpperCase() === codigoPrincipal.toUpperCase() && !isNaN(t) && (Date.now() - t) < TRASPASO_TEC_MS) return;
    props.setProperty(TRASPASO_TEC_KEY, String(Date.now()) + "|" + codigoPrincipal.toUpperCase());
  
    const datosOrigen = hojaOrigen.getDataRange().getValues();
    const coloresOrigen = hojaOrigen.getRange(1, 1, datosOrigen.length, 1).getFontColors();
  
    // Siempre encontrar la fila madre del conjunto (si se marcó un hijo, subir hasta la madre)
    let idxMadre = filaActiva - 1;
    while (idxMadre >= 0 && coloresOrigen[idxMadre][0] === "#999999") idxMadre--;
    if (idxMadre < 0) return;
    if (String(datosOrigen[idxMadre][0]).trim() !== codigoPrincipal) return;
  
    let filasParaEnviar = [];
    let coloresParaEnviar = [];
  
    // 1. Madre (solo una)
    let filaM = new Array(18).fill("");
    for (let k = 0; k < 6; k++) filaM[k] = datosOrigen[idxMadre][k];
    filaM[6] = "FABRICANDO";
    filaM[7] = ahora;
    filaM[8] = ahora; // inicio de fabricación (columna I)
    if (operarioFabricacion) filaM[10] = operarioFabricacion; // operario a cargo (columna K)
    filasParaEnviar.push(filaM);
    coloresParaEnviar.push(["#000000"]);
  
    // 2. Todos los hijos del conjunto (mismo código, color gris, consecutivos)
    for (let i = idxMadre + 1; i < datosOrigen.length; i++) {
      if (coloresOrigen[i][0] !== "#999999") break;
      if (String(datosOrigen[i][0]).trim() !== codigoPrincipal) break;
      let filaH = new Array(18).fill("");
      for (let k = 0; k < 6; k++) filaH[k] = datosOrigen[i][k];
      filaH[6] = "FABRICANDO";
      filaH[7] = ahora;
      filaH[8] = ahora; // inicio de fabricación (columna I)
      if (operarioFabricacion) filaH[10] = operarioFabricacion; // operario a cargo (columna K)
      filasParaEnviar.push(filaH);
      coloresParaEnviar.push(["#999999"]);
    }
  
    if (filasParaEnviar.length === 0) return;
  
    const filaDestino = 2;
    const cantidad = filasParaEnviar.length;
    hojaDestino.insertRows(filaDestino, cantidad);
    const rangoPegado = hojaDestino.getRange(filaDestino, 1, cantidad, 18);
    rangoPegado.clearDataValidations();
    rangoPegado.setValues(filasParaEnviar);
    hojaDestino.getRange(filaDestino, 1, cantidad, 1).setFontColors(coloresParaEnviar);
  
    const reglaMenu = SpreadsheetApp.newDataValidation()
      .requireValueInList(['BAJADA', 'FABRICANDO', 'ENTREGA PARCIAL', 'PARCIAL', 'ENTREGADO', 'ENTREGA CON OBSERVACION'], true)
      .setAllowInvalid(false)
      .build();
    hojaDestino.getRange(filaDestino, 7, cantidad, 1).setDataValidation(reglaMenu);
  
    // Destino Fabricación: QC = ALAN, LUIS
    const listaQCFab = ['ALAN', 'LUIS'];
    const reglaQC = SpreadsheetApp.newDataValidation().requireValueInList(listaQCFab, true).setAllowInvalid(false).build();
    hojaDestino.getRange(filaDestino, 15, cantidad, 1).setDataValidation(reglaQC);
  
    hojaDestino.getRange(filaDestino + cantidad, 1, 1, 18).setFontColor("#000000");
    if (cantidad > 1) {
      // Evitar doble agrupación: quitar todos los niveles de grupo en la primera fila de hijos hasta dejar 0, luego crear uno solo (BEFORE = "+" en madre)
      try {
        let depth = hojaDestino.getRowGroupDepth(filaDestino + 1);
        while (depth >= 1) {
          const gr = hojaDestino.getRowGroup(filaDestino + 1, depth);
          if (gr) gr.remove();
          depth = hojaDestino.getRowGroupDepth(filaDestino + 1);
        }
      } catch (err) { }
      hojaDestino.setRowGroupControlPosition(SpreadsheetApp.GroupControlTogglePosition.BEFORE);
      hojaDestino.getRange(filaDestino + 1, 1, cantidad - 1, 1).shiftRowGroupDepth(1);
      hojaDestino.getRowGroup(filaDestino + 1, 1).collapse();
    }
  }
  
  // Función helper para aplicar colores de fondo según el estado en Técnica (ENTREGADO = verde)
  function aplicarColoresEstadoTecnica(hoja, filaInicio, cantidad) {
    const coloresEstado = {
      "IMPRESO": null,
      "ENTREGADO": "#92d050"
    };
    for (let i = 0; i < cantidad; i++) {
      const filaActual = filaInicio + i;
      // Solo aplicar formato si la fila pertenece realmente a un conjunto:
      // debe tener código de proyecto en la columna 1.
      const codigo = String(hoja.getRange(filaActual, 1).getValue() || "").trim();
      if (!codigo) continue;
  
      const estado = String(hoja.getRange(filaActual, 7).getValue() || "").toUpperCase().trim();
      const colorFondo = coloresEstado[estado] || null;
      if (colorFondo) {
        hoja.getRange(filaActual, 1, 1, 12).setBackground(colorFondo);
      }
    }
  }
  
  // Función helper para aplicar colores de fondo según el estado en Remate
  function aplicarColoresEstadoRemate(hoja, filaInicio, cantidad) {
    const coloresEstado = {
      "EN REMATE": "#9fc5e8",
      "ENTREGADO": "#92d050"
    };
    const estados = hoja.getRange(filaInicio, 7, cantidad, 1).getValues();
    for (let i = 0; i < cantidad; i++) {
      const filaActual = filaInicio + i;
      const estado = String(estados[i][0] || "").toUpperCase().trim();
      const colorFondo = coloresEstado[estado] || null;
      if (colorFondo) {
        hoja.getRange(filaActual, 1, 1, 18).setBackground(colorFondo);
      }
    }
  }
  
  // Función helper para aplicar colores de fondo según el estado en Limpieza
  function aplicarColoresEstadoLimpieza(hoja, filaInicio, cantidad) {
    // EN LIMPIEZA: azul claro. ENTREGADO: verde
    const coloresEstado = {
      "EN LIMPIEZA": "#ADD8E6",
      "ENTREGADO": "#92d050"
    };
    const estados = hoja.getRange(filaInicio, 7, cantidad, 1).getValues();
    for (let i = 0; i < cantidad; i++) {
      const filaActual = filaInicio + i;
      const estado = String(estados[i][0] || "").toUpperCase().trim();
      const colorFondo = coloresEstado[estado] || null;
      if (colorFondo) {
        hoja.getRange(filaActual, 1, 1, 18).setBackground(colorFondo);
      }
    }
  }
  
  // Función helper para aplicar colores de fondo según el estado en Fabricación
  /**
   * Fabricación = fuente de verdad para cantidad (col C) y peso total (col E) de cada hijo.
   * - Sincroniza filas destino que no coinciden con Fabricación.
   * - Elimina filas hijo duplicadas (mismo código conjunto bajo la misma planificación).
   * @returns {number} filas corregidas o eliminadas
   */
  function blindajeCantidadesConjuntosHaciaDestino_(hojaFabricacion, hojaDestino, codigoPlan) {
    if (!hojaFabricacion || !hojaDestino || !codigoPlan) return 0;
    const plan = String(codigoPlan).trim();
    if (!plan) return 0;
    const round2 = (n) => Math.round((parseFloat(n) || 0) * 100) / 100;
    const normKey = (codigo, cant, pesoTotal) => {
      const c = String(codigo || "").trim().toUpperCase();
      if (!c) return "";
      return c + "|" + String(parseFloat(cant) || 0) + "|" + String(round2(pesoTotal));
    };

    const datosFab = hojaFabricacion.getDataRange().getValues();
    const coloresFab = hojaFabricacion.getRange(1, 1, Math.max(datosFab.length, 1), 1).getFontColors();
    /** @type {Record<string, Array<{cant:number,peso:number,key:string}>>} */
    const canonPorCodigo = {};

    let idxMadreFab = -1;
    for (let i = 1; i < datosFab.length; i++) {
      if (String(datosFab[i][0] || "").trim() !== plan) continue;
      if (!_esColorHijoFabricacion_(coloresFab[i] && coloresFab[i][0])) {
        idxMadreFab = i;
        break;
      }
    }
    if (idxMadreFab < 0) return 0;

    for (let i = idxMadreFab + 1; i < datosFab.length; i++) {
      if (String(datosFab[i][0] || "").trim() !== plan) break;
      if (!_esColorHijoFabricacion_(coloresFab[i] && coloresFab[i][0])) continue;
      const est = String(datosFab[i][6] || "").toUpperCase().trim();
      if (est !== "ENTREGADO" && est !== "PARCIAL" && est !== "ENTREGA CON OBSERVACION") continue;
      const cod = String(datosFab[i][1] || "").trim().toUpperCase();
      if (!cod) continue;
      const cant = parseFloat(datosFab[i][2]) || 0;
      const pesoUnit = parseFloat(datosFab[i][3]) || 0;
      const peso = parseFloat(datosFab[i][4]) || 0;
      const pesoCalc = pesoUnit ? round2(cant * pesoUnit) : round2(peso);
      const key = normKey(cod, cant, pesoCalc);
      if (!canonPorCodigo[cod]) canonPorCodigo[cod] = [];
      canonPorCodigo[cod].push({ cant, peso: pesoCalc, key });
    }

    const datosDest = hojaDestino.getDataRange().getValues();
    const coloresDest = hojaDestino.getRange(1, 1, Math.max(datosDest.length, 1), 1).getFontColors();
    /** @type {Record<string, Array<{row:number,cant:number,peso:number,key:string}>>} */
    const filasDestPorCodigo = {};

    for (let i = 1; i < datosDest.length; i++) {
      if (String(datosDest[i][0] || "").trim() !== plan) continue;
      if (!_esColorHijoFabricacion_(coloresDest[i] && coloresDest[i][0])) continue;
      const cod = String(datosDest[i][1] || "").trim().toUpperCase();
      if (!cod) continue;
      const cant = parseFloat(datosDest[i][2]) || 0;
      const peso = parseFloat(datosDest[i][4]) || 0;
      if (!filasDestPorCodigo[cod]) filasDestPorCodigo[cod] = [];
      filasDestPorCodigo[cod].push({
        row: i + 1,
        cant,
        peso: round2(peso),
        key: normKey(cod, cant, peso)
      });
    }

    let correcciones = 0;
    const filasAEliminar = [];

    Object.keys(filasDestPorCodigo).forEach(cod => {
      const refsFab = canonPorCodigo[cod];
      const filasDest = filasDestPorCodigo[cod];
      if (!refsFab || refsFab.length === 0) return;

      // Entrega parcial: varias filas válidas en Fabricación con el mismo código → no deduplicar
      if (refsFab.length > 1) {
        const keysFab = new Set(refsFab.map(r => r.key));
        filasDest.forEach(fd => {
          if (keysFab.has(fd.key)) return;
          const ref = refsFab.find(r => r.cant === fd.cant) || refsFab[0];
          if (fd.cant !== ref.cant || fd.peso !== ref.peso) {
            hojaDestino.getRange(fd.row, 3).setValue(ref.cant);
            hojaDestino.getRange(fd.row, 5).setValue(ref.peso);
            correcciones++;
          }
        });
        return;
      }

      const ref = refsFab[0];
      filasDest.sort((a, b) => a.row - b.row);
      const principal = filasDest[0];

      if (principal.cant !== ref.cant || principal.peso !== ref.peso) {
        hojaDestino.getRange(principal.row, 3).setValue(ref.cant);
        hojaDestino.getRange(principal.row, 5).setValue(ref.peso);
        correcciones++;
      }

      for (let d = 1; d < filasDest.length; d++) {
        filasAEliminar.push(filasDest[d].row);
        correcciones++;
      }
    });

    filasAEliminar.sort((a, b) => b - a);
    filasAEliminar.forEach(rowNum => {
      try {
        hojaDestino.deleteRow(rowNum);
      } catch (eDel) { }
    });

    return correcciones;
  }

  function aplicarColoresEstadoFabricacion(hoja, filaInicio, cantidad) {
    const coloresEstado = {
      "ENTREGADO": "#92d050",
      "ENTREGA CON OBSERVACION": "#92d050"
    };
    const estados = hoja.getRange(filaInicio, 7, cantidad, 1).getValues();
    for (let i = 0; i < cantidad; i++) {
      const filaActual = filaInicio + i;
      const estado = String(estados[i][0] || "").toUpperCase().trim();
      const colorFondo = coloresEstado[estado] || null;
      if (colorFondo) {
        hoja.getRange(filaActual, 1, 1, 18).setBackground(colorFondo);
      }
    }
  }
  
  function traspasoMasivoFabricacion(hojaOrigen, hojaDestino, filaActiva, ahora, filaHijoNuevoEntregado, datosFilaEntregada, forzarLoteCompleto) {
    const codigoPrincipal = String(hojaOrigen.getRange(filaActiva, 1).getValue()).trim();
    if (!codigoPrincipal) {
      return {
        ok: false,
        motivo: "SIN_CODIGO_PLAN",
        detalle: "En Fabricación, la columna A (código planificación) está vacía en la fila " + filaActiva + "."
      };
    }
    // Bandera interna: forzar traspaso (evitar no-op por anti-duplicado / filtro entrega parcial).
    // forzarLoteCompleto: mismo efecto sin depender de la propiedad (entrega selectiva / cierre total); si no, solo hijos con col B = madre pasan el filtro.
    const propsFab = PropertiesService.getScriptProperties();
    const FORCE_KEY = "forzarTraspasoFab";
    const codigoPrincipalNorm = String(codigoPrincipal || "").trim().toUpperCase();
    const forceCodigo = String(propsFab.getProperty(FORCE_KEY) || "").trim().toUpperCase();
    const forzarPorProp = !!forceCodigo && forceCodigo === codigoPrincipalNorm;
    const forzar = forzarPorProp || !!forzarLoteCompleto;
    if (forzarPorProp) {
      try { propsFab.deleteProperty(FORCE_KEY); } catch (eDelF) { }
    } else if (forzarLoteCompleto && forceCodigo === codigoPrincipalNorm) {
      try { propsFab.deleteProperty(FORCE_KEY); } catch (eDelF2) { }
    }
    // Evitar doble traspaso del mismo evento de entrega en una ventana corta.
    // onEdit puede dispararse más de una vez en secuencias con validaciones/firma.
    const codigoConjuntoEvento = String(hojaOrigen.getRange(filaActiva, 2).getValue() || "").trim().toUpperCase();
    const cantidadEvento = String(hojaOrigen.getRange(filaActiva, 3).getValue() || "").trim();
    const estadoEvento = String(hojaOrigen.getRange(filaActiva, 7).getValue() || "").trim().toUpperCase();
    const TRASPASO_FAB_KEY = "traspasoFabricacionUltimo";
    const TRASPASO_FAB_MS = 6000;
    const ultimaFirmaTraspasoFab = propsFab.getProperty(TRASPASO_FAB_KEY) || "";
    const partesFab = ultimaFirmaTraspasoFab.split("|");
    const ultimoTsFab = parseInt(partesFab[0] || "0", 10);
    const ultimaClaveFab = partesFab.slice(1).join("|");
    // Incluir fila del disparo: varios hijos pueden compartir plan+B+cantidad; sin esto el 2.º cae en OMITIDO_ANTIDUP_6S.
    const claveActualFab = [
      codigoPrincipal.toUpperCase(),
      codigoConjuntoEvento,
      cantidadEvento,
      estadoEvento,
      "F" + String(filaActiva)
    ].join("|");
    if (
      ultimaClaveFab === claveActualFab &&
      !isNaN(ultimoTsFab) &&
      (Date.now() - ultimoTsFab) < TRASPASO_FAB_MS
    ) {
      if (!forzar) {
        return {
          ok: false,
          motivo: "OMITIDO_ANTIDUP_6S",
          detalle: "El traspaso se omitió porque la misma operación se registró hace menos de 6 segundos (anti-duplicado).\n\nClave: " + claveActualFab + "\n\nEspere unos segundos y vuelva a intentar; la entrega selectiva fuerza el traspaso.",
          meta: { clave: claveActualFab }
        };
      }
    }
    // Si forzamos, añadimos sufijo para no colisionar con la misma clave
    propsFab.setProperty(
      TRASPASO_FAB_KEY,
      String(Date.now()) + "|" + claveActualFab + (forzar ? "|FORZADO" : "")
    );
    SpreadsheetApp.flush();
    let datosOrigen = hojaOrigen.getDataRange().getValues();
    let coloresOrigen = hojaOrigen.getRange(1, 1, Math.max(datosOrigen.length, 1), 1).getFontColors();
  
    // Después de una entrega parcial, la fila nueva puede no estar en getDataRange(): incluirla con datos que ya tenemos
    if (filaHijoNuevoEntregado && datosOrigen.length < filaHijoNuevoEntregado) {
      const rowData = (datosFilaEntregada && datosFilaEntregada.length >= 18)
        ? datosFilaEntregada.slice(0, 18)
        : hojaOrigen.getRange(filaHijoNuevoEntregado, 1, 1, 18).getValues()[0];
      datosOrigen.push(rowData);
      coloresOrigen.push(["#999999"]);
    }
    // Asegurar que la fila hijo nueva se trate como gris por si getFontColors no la devolvió aún
    if (filaHijoNuevoEntregado && filaHijoNuevoEntregado <= coloresOrigen.length && coloresOrigen[filaHijoNuevoEntregado - 1][0] !== "#999999") {
      coloresOrigen[filaHijoNuevoEntregado - 1] = ["#999999"];
    }
    // Si nos pasaron la fila de la entrega parcial, usarla para ese índice si ya está en datosOrigen (sobrescribir por si la hoja no reflejó aún)
    if (filaHijoNuevoEntregado && datosFilaEntregada && datosFilaEntregada.length >= 18 && filaHijoNuevoEntregado <= datosOrigen.length) {
      const idx = filaHijoNuevoEntregado - 1;
      for (let k = 0; k < 18; k++) datosOrigen[idx][k] = datosFilaEntregada[k];
      if (coloresOrigen[idx]) coloresOrigen[idx] = ["#999999"];
    }
  
    let filasParaEnviar = [],
      coloresParaEnviar = [];
  
    // Código de conjunto específico que disparó la entrega (columna B del hijo/madre activa)
    let codigoConjuntoEntrega = String(hojaOrigen.getRange(filaActiva, 2).getValue() || "").trim().toUpperCase();
    if (forzar) {
      // En modo forzado, NO filtrar por un solo código de conjunto: enviar todos los hijos ENTREGADO del bloque.
      codigoConjuntoEntrega = "";
    }
  
    // Encontrar la fila madre (si se marcó un hijo, subir hasta la madre)
    let idxMadre = filaActiva - 1;
    while (idxMadre >= 0 && coloresOrigen[idxMadre] && _esColorHijoFabricacion_(coloresOrigen[idxMadre][0])) idxMadre--;
    if (idxMadre < 0 || !datosOrigen[idxMadre] || String(datosOrigen[idxMadre][0]).trim() !== codigoPrincipal) {
      const valA = datosOrigen[idxMadre] ? String(datosOrigen[idxMadre][0]).trim() : "(sin datos)";
      return {
        ok: false,
        motivo: "MADRE_NO_ALINEADA",
        detalle: "No se encontró la fila madre coherente con el código \"" + codigoPrincipal + "\".\n\n" +
          "Fila usada como referencia: " + filaActiva + ".\n" +
          "Tras subir por filas \"hijo\", la fila madre detectada (índice " + (idxMadre + 1) + ") tiene en col A: \"" + valA + "\".\n\n" +
          "Revise que madre e hijos compartan el mismo texto en columna A y el orden de filas.",
        meta: { filaActiva: filaActiva, idxMadreFila: idxMadre + 1 }
      };
    }
  
    let filaM = new Array(18).fill("");
    for (let k = 0; k < 6; k++) filaM[k] = datosOrigen[idxMadre][k];
    filaM[6] = "EN REMATE";
    filaM[7] = ahora;
    filasParaEnviar.push(filaM);
    coloresParaEnviar.push(["#000000"]);
    const planMadre = String(datosOrigen[idxMadre][0] || "").trim();
    // Bloque de hijos: filas consecutivas con el mismo código de planificación (col A) que la madre.
    // Antes solo se aceptaba fuente gris #999999; Sheets a veces devuelve otro formato y se cortaba el bloque → 0 hijos en Remate.
    for (let i = idxMadre + 1; i < datosOrigen.length; i++) {
      const planRow = String(datosOrigen[i][0] || "").trim();
      if (planRow !== planMadre) break;
      const estHijo = String(datosOrigen[i][6] || "").toUpperCase().trim();
      if (estHijo !== "ENTREGADO") continue;
      let filaH = new Array(18).fill("");
      for (let k = 0; k < 6; k++) filaH[k] = datosOrigen[i][k];
      filaH[6] = "EN REMATE";
      filaH[7] = ahora;
      filasParaEnviar.push(filaH);
      coloresParaEnviar.push(["#999999"]);
    }
    if (filasParaEnviar.length === 0) {
      return { ok: false, motivo: "SIN_FILAS_LOTE", detalle: "No se armó el lote para Remate (error interno)." };
    }
  
    // Ver si esta planificación ya existe en Remate (madre + hijos ya traspasados)
    const datosRemate = hojaDestino.getDataRange().getValues();
    const coloresRemate = hojaDestino.getRange(1, 1, datosRemate.length, 1).getFontColors();
    let remateMadreRow = 0;      // 1-based, 0 = no encontrada
    let remateLastHijoRow = 0;
    const remateConjuntosSet = new Set(); // clave unico normalizado por conjunto+cantidad+peso
    const hijosExistentes = {};  // clave: codigoConj (upper) -> {row, cantidad, pesoUnit, pesoTotal}
    const round2 = (n) => Math.round((parseFloat(n) || 0) * 100) / 100;
    const normKey = (codigo, cant, pesoTotal) => {
      const c = String(codigo || "").trim().toUpperCase();
      if (!c) return "";
      const cantN = (parseFloat(cant) || 0);
      const pesoN = round2(pesoTotal);
      return c + "|" + String(cantN) + "|" + String(pesoN);
    };
    for (let i = 1; i < datosRemate.length; i++) {
      if (String(datosRemate[i][0]).trim() !== codigoPrincipal) continue;
      if (_esColorHijoFabricacion_(coloresRemate[i][0])) continue; // es hijo, la madre ya se encontró antes
      // Fila madre en Remate
      remateMadreRow = i + 1;
      remateLastHijoRow = i + 1;
      for (let j = i + 1; j < datosRemate.length; j++) {
        if (!_esColorHijoFabricacion_(coloresRemate[j][0]) || String(datosRemate[j][0]).trim() !== codigoPrincipal) break;
          const codExist = String(datosRemate[j][1]).trim().toUpperCase();
          const cantExist = parseFloat(datosRemate[j][2]) || 0;
          const pesoUnitExist = parseFloat(datosRemate[j][3]) || 0;
          const pesoTotExist = parseFloat(datosRemate[j][4]) || 0;
          if (codExist) {
            hijosExistentes[codExist] = {
              row: j + 1,
              cantidad: cantExist,
              pesoUnit: pesoUnitExist,
              pesoTotal: pesoTotExist
            };
          }
        const keyExistente = normKey(codExist, cantExist, pesoTotExist);
        if (keyExistente) remateConjuntosSet.add(keyExistente);
        remateLastHijoRow = j + 1;
      }
      break;
    }
  
    const reglaMenu = SpreadsheetApp.newDataValidation()
      .requireValueInList(['EN REMATE', 'ENTREGADO'], true)
      .setAllowInvalid(false)
      .build();
    // Destino Remate: QC = Francisco San Martín, Luis Ulloa, Victor Leiva
    const listaQCRemate = ['FRANCISCO SAN MARTÍN', 'LUIS ULLOA', 'VICTOR LEIVA'];
    const reglaQC = SpreadsheetApp.newDataValidation().requireValueInList(listaQCRemate, true).setAllowInvalid(false).build();
    const nuevosHijos = [];
    const nuevosColores = [];
    const updatesHijos = [];
    const debugLogs = [];
  
    if (remateMadreRow === 0) {
      // Planificación nueva en Remate: insertar madre + todos los hijos ENTREGADO al inicio
      const filaDestino = 2;
      const cantidad = filasParaEnviar.length;
      hojaDestino.insertRows(filaDestino, cantidad);
      const rangoPegado = hojaDestino.getRange(filaDestino, 1, cantidad, 18);
      rangoPegado.clearDataValidations();
      rangoPegado.setValues(filasParaEnviar);
      hojaDestino.getRange(filaDestino, 1, cantidad, 1).setFontColors(coloresParaEnviar);
      hojaDestino.getRange(filaDestino, 7, cantidad, 1).setDataValidation(reglaMenu);
      hojaDestino.getRange(filaDestino, 11, cantidad, 1).setDataValidation(reglaQC);
      
      hojaDestino.getRange(filaDestino + cantidad, 1, 1, 18).setFontColor("#000000");
      
      // Crear agrupación ANTES de aplicar colores de fondo para evitar interferencias
      if (cantidad > 1) {
        hojaDestino.setRowGroupControlPosition(SpreadsheetApp.GroupControlTogglePosition.BEFORE);
        hojaDestino.getRange(filaDestino + 1, 1, cantidad - 1, 1).shiftRowGroupDepth(1);
        SpreadsheetApp.flush();
        //hojaDestino.getRowGroup(filaDestino + 1, 1).collapse();
      }
      
      // Aplicar colores de fondo según el estado DESPUÉS de crear el grupo
      aplicarColoresEstadoRemate(hojaDestino, filaDestino, cantidad);
      blindajeCantidadesConjuntosHaciaDestino_(hojaOrigen, hojaDestino, codigoPrincipal);
      return {
        ok: true,
        motivo: "CONJUNTOS_ENTREGADOS",
        detalle: "Planificación nueva en Remate: se insertaron " + cantidad + " fila(s) en la fila 2 (madre + hijos ENTREGADO). Código: " + codigoPrincipal + ".",
        meta: { filas: cantidad, hijos: cantidad - 1 }
      };
    }
    for (let f = 1; f < filasParaEnviar.length; f++) {
      const codigoConj = String(filasParaEnviar[f][1] || "").trim().toUpperCase();
      const cantNueva = parseFloat(filasParaEnviar[f][2]) || 0;
      const pesoUnitNuevo = parseFloat(filasParaEnviar[f][3]) || 0;
      const pesoTotalNuevo = parseFloat(filasParaEnviar[f][4]) || 0;
      const keyNuevo = normKey(codigoConj, cantNueva, pesoTotalNuevo);
  
      // Si se está entregando un conjunto específico (col B del activo), solo procesar ese código
      if (codigoConjuntoEntrega && codigoConj !== codigoConjuntoEntrega) {
        debugLogs.push(`SKIP OTHER ${codigoConj} (no coincide con ${codigoConjuntoEntrega})`);
        continue;
      }
  
      // BLINDAJE: nunca sumar cantidades en traspasos repetidos. Fabricación es la fuente de verdad.
      if (keyNuevo && remateConjuntosSet.has(keyNuevo)) {
        debugLogs.push(`SKIP DUP ${codigoConj} (cant=${cantNueva}, peso=${pesoTotalNuevo})`);
        continue;
      }

      // Mismo código conjunto ya en Remate: sincronizar con Fabricación, nunca insertar otra fila ni sumar
      if (codigoConj && hijosExistentes[codigoConj]) {
        const info = hijosExistentes[codigoConj];
        const keyExist = normKey(codigoConj, info.cantidad, info.pesoTotal);
        if (keyExist !== keyNuevo) {
          updatesHijos.push({ row: info.row, cantidad: cantNueva, pesoTotal: pesoTotalNuevo });
          remateConjuntosSet.delete(keyExist);
          remateConjuntosSet.add(keyNuevo);
          hijosExistentes[codigoConj] = {
            row: info.row,
            cantidad: cantNueva,
            pesoUnit: pesoUnitNuevo,
            pesoTotal: pesoTotalNuevo
          };
          debugLogs.push(`SYNC ${codigoConj}: fila ${info.row} -> cant=${cantNueva}`);
        } else {
          debugLogs.push(`SKIP OK ${codigoConj} (ya coincide con Fabricación)`);
        }
        continue;
      }

      nuevosHijos.push(filasParaEnviar[f]);
      nuevosColores.push(["#999999"]);
      debugLogs.push(`INSERT ${codigoConj}: cant=${cantNueva}`);
    }
  
    if (updatesHijos.length > 0) {
      updatesHijos.forEach(upd => {
        hojaDestino.getRange(upd.row, 3).setValue(upd.cantidad);
        hojaDestino.getRange(upd.row, 5).setValue(upd.pesoTotal);
      });
    }
  
    const nCorregidas = blindajeCantidadesConjuntosHaciaDestino_(hojaOrigen, hojaDestino, codigoPrincipal);

    if (nuevosHijos.length === 0) {
      const nHijosFab = Math.max(0, filasParaEnviar.length - 1);
      if (updatesHijos.length > 0 || nCorregidas > 0) {
        return {
          ok: true,
          motivo: "OK_SOLO_ACTUALIZACION",
          detalle: "En Remate ya existía la planificación. Se sincronizaron cantidades con Fabricación (" +
            (updatesHijos.length + nCorregidas) + " fila(s)). Hijo(s) ENTREGADO leídos en Fabricación: " + nHijosFab + ".",
          meta: { actualizadas: updatesHijos.length, corregidas: nCorregidas, hijosEnLoteFab: nHijosFab }
        };
      }
      return {
        ok: false,
        motivo: "REMATE_SIN_CAMBIOS",
        detalle: "No se insertó ni actualizó nada en Remate. Suele pasar si esas filas ya estaban copiadas (mismo conjunto+cantidad+peso) o el filtro dejó el lote vacío.\n\n" +
          "Hijo(s) ENTREGADO en el lote desde Fabricación: " + nHijosFab + ".\n" +
          "Madre ya existía en Remate en fila " + remateMadreRow + ".",
        meta: { hijosEnLoteFab: nHijosFab, remateMadreRow: remateMadreRow }
      };
    }
  
    hojaDestino.insertRowsAfter(remateLastHijoRow, nuevosHijos.length);
    const filaInsercion = remateLastHijoRow + 1;
    const numFilas = nuevosHijos.length;
    // getRange(row, column, numRows, numColumns) - 3º y 4º son CANTIDAD, no fila/col final
    const rangoNuevo = hojaDestino.getRange(filaInsercion, 1, numFilas, 18);
    rangoNuevo.clearDataValidations();
    rangoNuevo.setValues(nuevosHijos);
    hojaDestino.getRange(filaInsercion, 1, numFilas, 1).setFontColors(nuevosColores);
    hojaDestino.getRange(filaInsercion, 7, numFilas, 1).setDataValidation(reglaMenu);
    hojaDestino.getRange(filaInsercion, 11, numFilas, 1).setDataValidation(reglaQC);
    
    // Aplicar colores de fondo según el estado
    aplicarColoresEstadoRemate(hojaDestino, filaInsercion, numFilas);
    return {
      ok: true,
      motivo: "OK_CONJUNTOS_ENTREGADOS",
      detalle: "Se insertaron " + numFilas + " fila(s) hijo en Remate bajo la madre (fila " + remateMadreRow + "). Sincronizaciones: " +
        (updatesHijos.length + nCorregidas) + ".",
      meta: { insertadas: numFilas, actualizadas: updatesHijos.length, corregidas: nCorregidas }
    };
  }
  
  /**
   * Traspasa datos de REMATE → LIMPIEZA (igual que Fabricación→Remate).
   * Origen: hoja Remate. Destino: hoja Limpieza.
   * Pasa madre + hijos con estado ENTREGADO; si la planificación ya está en Limpieza, solo añade hijos nuevos.
   */
  function traspasoMasivoRemate(hojaOrigen, hojaDestino, filaActiva, ahora) {
    if (!hojaDestino || hojaDestino.getName() !== "Limpieza") return;
    const codigoPrincipal = String(hojaOrigen.getRange(filaActiva, 1).getValue()).trim();
    if (!codigoPrincipal) return;
    const datosOrigen = hojaOrigen.getDataRange().getValues();
    const coloresOrigen = hojaOrigen.getRange(1, 1, datosOrigen.length, 1).getFontColors();
    let filasParaEnviar = [],
      coloresParaEnviar = [];
    const round2 = (n) => Math.round((parseFloat(n) || 0) * 100) / 100;
    const normKey = (codigo, cant, pesoTotal) => {
      const c = String(codigo || "").trim().toUpperCase();
      if (!c) return "";
      const cantN = (parseFloat(cant) || 0);
      const pesoN = round2(pesoTotal);
      return c + "|" + String(cantN) + "|" + String(pesoN);
    };
  
    // Encontrar la fila madre (si se marcó un hijo, subir hasta la madre)
    let idxMadre = filaActiva - 1;
    while (idxMadre >= 0 && _esColorHijoFabricacion_(coloresOrigen[idxMadre][0])) idxMadre--;
    if (idxMadre < 0 || String(datosOrigen[idxMadre][0]).trim() !== codigoPrincipal) return;
  
    let filaM = new Array(18).fill("");
    for (let k = 0; k < 6; k++) filaM[k] = datosOrigen[idxMadre][k];
    filaM[6] = "EN LIMPIEZA";
    filaM[7] = ahora;
    filasParaEnviar.push(filaM);
    coloresParaEnviar.push(["#000000"]);
    // Solo pasar los hijos que tienen estado ENTREGADO. En Remate el estado está en columna 7 (índice 6).
    const idxColEstadoRemate = 6;
    for (let i = idxMadre + 1; i < datosOrigen.length; i++) {
      if (!_esColorHijoFabricacion_(coloresOrigen[i][0])) break;
      const estHijo = String(datosOrigen[i][idxColEstadoRemate] || "").toUpperCase().trim();
      if (estHijo !== "ENTREGADO") continue;
      let filaH = new Array(18).fill("");
      for (let k = 0; k < 6; k++) filaH[k] = datosOrigen[i][k];
      filaH[6] = "EN LIMPIEZA";
      filaH[7] = ahora;
      filasParaEnviar.push(filaH);
      coloresParaEnviar.push(["#999999"]);
    }
    if (filasParaEnviar.length === 0) return;
  
    // Ver si esta planificación ya existe en Limpieza (madre + hijos ya traspasados)
    const datosLimpieza = hojaDestino.getDataRange().getValues();
    const coloresLimpieza = hojaDestino.getRange(1, 1, datosLimpieza.length, 1).getFontColors();
    let limpiezaMadreRow = 0;      // 1-based, 0 = no encontrada
    let limpiezaLastHijoRow = 0;
    const limpiezaConjuntosSet = new Set(); // clave unico normalizado por conjunto+cantidad+peso
    const hijosExistentesLimp = {}; // codigoConj (upper) -> {row, cantidad, pesoTotal}
    for (let i = 1; i < datosLimpieza.length; i++) {
      if (String(datosLimpieza[i][0]).trim() !== codigoPrincipal) continue;
      if (_esColorHijoFabricacion_(coloresLimpieza[i][0])) continue; // es hijo, la madre ya se encontró antes
      // Fila madre en Limpieza
      limpiezaMadreRow = i + 1;
      limpiezaLastHijoRow = i + 1;
      for (let j = i + 1; j < datosLimpieza.length; j++) {
        if (!_esColorHijoFabricacion_(coloresLimpieza[j][0]) || String(datosLimpieza[j][0]).trim() !== codigoPrincipal) break;
        const codExist = String(datosLimpieza[j][1]).trim().toUpperCase();
        const cantExist = parseFloat(datosLimpieza[j][2]) || 0;
        const pesoTotExist = parseFloat(datosLimpieza[j][4]) || 0;
        const keyExistente = normKey(codExist, cantExist, pesoTotExist);
        if (keyExistente) limpiezaConjuntosSet.add(keyExistente);
        if (codExist && !hijosExistentesLimp[codExist]) {
          hijosExistentesLimp[codExist] = { row: j + 1, cantidad: cantExist, pesoTotal: pesoTotExist };
        }
        limpiezaLastHijoRow = j + 1;
      }
      break;
    }
  
    const reglaMenu = SpreadsheetApp.newDataValidation()
      .requireValueInList(['EN LIMPIEZA', 'ENTREGADO'], true)
      .setAllowInvalid(false)
      .build();
    // Destino Limpieza: mismos firmantes que Remate
    const listaQCLimpieza = ['FRANCISCO SAN MARTÍN', 'LUIS ULLOA', 'VICTOR LEIVA'];
    const reglaQC = SpreadsheetApp.newDataValidation().requireValueInList(listaQCLimpieza, true).setAllowInvalid(false).build();
  
    if (limpiezaMadreRow === 0) {
      // Planificación nueva en Limpieza: insertar madre + todos los hijos ENTREGADO al inicio (igual que Fabricación→Remate)
      const filaDestino = 2;
      const cantidad = filasParaEnviar.length;
      hojaDestino.insertRows(filaDestino, cantidad);
      const rangoPegado = hojaDestino.getRange(filaDestino, 1, cantidad, 18);
      rangoPegado.clearDataValidations();
      rangoPegado.setValues(filasParaEnviar);
      hojaDestino.getRange(filaDestino, 1, cantidad, 1).setFontColors(coloresParaEnviar);
      hojaDestino.getRange(filaDestino, 7, cantidad, 1).setDataValidation(reglaMenu);
      hojaDestino.getRange(filaDestino, 15, cantidad, 1).setDataValidation(reglaQC);
      aplicarColoresEstadoLimpieza(hojaDestino, filaDestino, cantidad);
      hojaDestino.getRange(filaDestino + cantidad, 1, 1, 18).setFontColor("#000000");
      if (cantidad > 1) {
        hojaDestino.getRange(filaDestino + 1, 1, cantidad - 1, 1).shiftRowGroupDepth(1);
        hojaDestino.getRowGroup(filaDestino + 1, 1).collapse();
      }
      const hFabIns = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Fabricación");
      if (hFabIns) blindajeCantidadesConjuntosHaciaDestino_(hFabIns, hojaDestino, codigoPrincipal);
      return;
    }
  
    // Planificación ya existe: sincronizar o insertar hijos (nunca duplicar por código conjunto)
    const nuevosHijos = [];
    const nuevosColores = [];
    for (let f = 1; f < filasParaEnviar.length; f++) {
      const codigoConj = String(filasParaEnviar[f][1] || "").trim().toUpperCase();
      const cantNueva = parseFloat(filasParaEnviar[f][2]) || 0;
      const pesoTotNuevo = parseFloat(filasParaEnviar[f][4]) || 0;
      const keyNuevo = normKey(codigoConj, cantNueva, pesoTotNuevo);
      if (keyNuevo && limpiezaConjuntosSet.has(keyNuevo)) continue;
      if (codigoConj && hijosExistentesLimp[codigoConj]) {
        const info = hijosExistentesLimp[codigoConj];
        const keyExist = normKey(codigoConj, info.cantidad, info.pesoTotal);
        if (keyExist !== keyNuevo) {
          hojaDestino.getRange(info.row, 3).setValue(cantNueva);
          hojaDestino.getRange(info.row, 5).setValue(pesoTotNuevo);
          limpiezaConjuntosSet.delete(keyExist);
          limpiezaConjuntosSet.add(keyNuevo);
          hijosExistentesLimp[codigoConj] = { row: info.row, cantidad: cantNueva, pesoTotal: pesoTotNuevo };
        }
        continue;
      }
      nuevosHijos.push(filasParaEnviar[f]);
      nuevosColores.push(["#999999"]);
    }
    if (nuevosHijos.length > 0) {
      hojaDestino.insertRowsAfter(limpiezaLastHijoRow, nuevosHijos.length);
      const filaInsercion = limpiezaLastHijoRow + 1;
      const numFilas = nuevosHijos.length;
      const rangoNuevo = hojaDestino.getRange(filaInsercion, 1, numFilas, 18);
      rangoNuevo.clearDataValidations();
      rangoNuevo.setValues(nuevosHijos);
      hojaDestino.getRange(filaInsercion, 1, numFilas, 1).setFontColors(nuevosColores);
      hojaDestino.getRange(filaInsercion, 7, numFilas, 1).setDataValidation(reglaMenu);
      hojaDestino.getRange(filaInsercion, 15, numFilas, 1).setDataValidation(reglaQC);
      aplicarColoresEstadoLimpieza(hojaDestino, filaInsercion, numFilas);
    }
    const hFab = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Fabricación");
    if (hFab) blindajeCantidadesConjuntosHaciaDestino_(hFab, hojaDestino, codigoPrincipal);
  }
  
  function obtenerBloquePlanificacion(hoja, codigoPlan) {
    const codigo = String(codigoPlan || "").trim().toUpperCase();
    if (!codigo) return null;
    const datos = hoja.getDataRange().getValues();
    if (datos.length < 2) return null;
    const colores = hoja.getRange(1, 1, datos.length, 1).getFontColors();
    for (let i = 1; i < datos.length; i++) {
      const cod = String(datos[i][0] || "").trim().toUpperCase();
      if (cod !== codigo) continue;
      if (colores[i][0] === "#999999") continue;
      const filaMadre = i + 1;
      let cantidad = 1;
      for (let j = i + 1; j < datos.length; j++) {
        const codH = String(datos[j][0] || "").trim().toUpperCase();
        if (colores[j][0] !== "#999999" || codH !== codigo) break;
        cantidad++;
      }
      return { filaMadre, cantidad };
    }
    return null;
  }
  
  // ---------------------------
  // Cola Técnica -> Fabricación
  // ---------------------------
  function encolarTraspasoTecnicaPendiente(codigoPlan) {
    const codigo = String(codigoPlan || "").trim().toUpperCase();
    if (!codigo) return;
    const props = PropertiesService.getScriptProperties();
    // Guardamos por código como propiedad independiente para evitar condiciones de carrera.
    const KEY_PREFIX = "colaTraspasoTecnicaPendiente:";
    props.setProperty(KEY_PREFIX + codigo, String(Date.now()));
  }
  
  function colaTraspasoTecnicaTienePendientes() {
    const all = PropertiesService.getScriptProperties().getProperties();
    return Object.keys(all).some(k => k.indexOf("colaTraspasoTecnicaPendiente:") === 0);
  }
  
  function _procesarColaTraspasosTecnicaInterno(ss, ahora) {
    const props = PropertiesService.getScriptProperties();
    const hojaTecnica = ss.getSheetByName("Técnica");
    const hojaFabricacion = ss.getSheetByName("Fabricación");
    if (!hojaTecnica || !hojaFabricacion) return;
  
    const KEY_TRASPASO_TEC = "traspasoTecnicaEnCurso";
    const KEY_PREFIX = "colaTraspasoTecnicaPendiente:";
  
    let iter = 0;
    while (iter < 30) {
      iter++;
      const all = props.getProperties();
      const keysPendientes = Object.keys(all)
        .filter(k => k.startsWith(KEY_PREFIX));
      if (keysPendientes.length === 0) break;
  
      keysPendientes.sort((a, b) => parseInt(all[a] || "0", 10) - parseInt(all[b] || "0", 10));
  
      for (const key of keysPendientes) {
        const codigo = key.substring(KEY_PREFIX.length).trim().toUpperCase();
        if (!codigo) {
          props.deleteProperty(key);
          continue;
        }
  
        const bloque = obtenerBloquePlanificacion(hojaTecnica, codigo);
        if (!bloque) {
          props.deleteProperty(key);
          continue;
        }
  
        props.setProperty(KEY_TRASPASO_TEC, String(Date.now()) + "|" + codigo);
        traspasoMasivoTecnica(hojaTecnica, hojaFabricacion, bloque.filaMadre, ahora);
        SpreadsheetApp.flush();
        props.deleteProperty(key);
      }
    }
  }
  
  function procesarColaTraspasosTecnica(ss, ahora) {
    const props = PropertiesService.getScriptProperties();
    const lock = LockService.getScriptLock();
    // Mismo ScriptLock que usarTransfer en ejecutarAccionesEntregado: tryLock aquí fallaba
    // a menudo y dejaba la cola sin drenar. waitLock asegura secuencia única.
    try {
      lock.waitLock(60000);
    } catch (eWait) {
      return;
    }
    try {
      _procesarColaTraspasosTecnicaInterno(ss, ahora);
    } finally {
      props.deleteProperty("traspasoTecnicaEnCurso");
      try { lock.releaseLock(); } catch (e) { }
    }
    // Si quedaron claves (p. ej. filas aún sin ENTREGADO o carrera), un segundo pase corto.
    if (colaTraspasoTecnicaTienePendientes()) {
      Utilities.sleep(400);
      try {
        lock.waitLock(60000);
      } catch (e2) {
        return;
      }
      try {
        _procesarColaTraspasosTecnicaInterno(ss, new Date());
      } finally {
        props.deleteProperty("traspasoTecnicaEnCurso");
        try { lock.releaseLock(); } catch (e3) { }
      }
    }
  }
  
  function cerrarBloqueComoEntregadoEnHoja(hoja, codigoPlan, ahora) {
    const bloque = obtenerBloquePlanificacion(hoja, codigoPlan);
    if (!bloque) return null;
    const fila = bloque.filaMadre;
    const cant = bloque.cantidad;
  
    hoja.getRange(fila, 7, cant, 1).setValue("ENTREGADO");
    // Remate/Limpieza usan col 9 como fecha de fin.
    if (hoja.getName() === "Remate" || hoja.getName() === "Limpieza") {
      hoja.getRange(fila, 9, cant, 1).setValue(ahora).setNumberFormat("hh:mmam/pm dd/MM/yy");
      const qcBase = String(hoja.getRange(fila, 11).getValue() || "").trim() || "CIERRE MASIVO";
      const opBase = String(hoja.getRange(fila, 10).getValue() || "").trim() || "CIERRE MASIVO";
      hoja.getRange(fila, 11, cant, 1).setValue(qcBase);
      hoja.getRange(fila, 10, cant, 1).setValue(opBase);
    }
  
    if (hoja.getName() === "Remate") aplicarColoresEstadoRemate(hoja, fila, cant);
    if (hoja.getName() === "Limpieza") aplicarColoresEstadoLimpieza(hoja, fila, cant);
    return bloque;
  }
  
  function cierreTotalPlanificacionDesdeFabricacion(ss, hojaFabricacion, filaMadreFab, ahora) {
    const codigoPlan = String(hojaFabricacion.getRange(filaMadreFab, 1).getValue() || "").trim();
    if (!codigoPlan) return;
    const hojaRemate = ss.getSheetByName("Remate");
    const hojaLimpieza = ss.getSheetByName("Limpieza");
    if (!hojaRemate || !hojaLimpieza) return;
  
    // 1) Asegurar que llegue completa a Remate (madre + hijos entregados).
    traspasoMasivoFabricacion(hojaFabricacion, hojaRemate, filaMadreFab, ahora, undefined, undefined, true);
    SpreadsheetApp.flush();
  
    // 2) Cerrar Remate completo en ENTREGADO.
    const bloqueRemate = cerrarBloqueComoEntregadoEnHoja(hojaRemate, codigoPlan, ahora);
    if (!bloqueRemate) return;
    SpreadsheetApp.flush();
  
    // 3) Traspasar Remate -> Limpieza con todo entregado.
    traspasoMasivoRemate(hojaRemate, hojaLimpieza, bloqueRemate.filaMadre, ahora);
    SpreadsheetApp.flush();
  
    // 4) Cerrar Limpieza completo en ENTREGADO.
    cerrarBloqueComoEntregadoEnHoja(hojaLimpieza, codigoPlan, ahora);
  }
  
  function calcularMinutosHabiles(fechaInicio, fechaFin) {
    if (!fechaInicio || !fechaFin) return 0;
    
    // Convertir a Date si son strings o valores no-Date
    if (!(fechaInicio instanceof Date)) {
      fechaInicio = convertirTextoAFecha(fechaInicio);
      if (!fechaInicio) return 0;
    }
    if (!(fechaFin instanceof Date)) {
      fechaFin = convertirTextoAFecha(fechaFin);
      if (!fechaFin) return 0;
    }
    
    if (fechaFin < fechaInicio) return 0;
  
    let cursor = new Date(fechaInicio.getTime());
    const finMs = fechaFin.getTime();
    let minutosHabiles = 0;
  
    cursor.setSeconds(0);
    cursor.setMilliseconds(0);
    if (cursor < fechaInicio) cursor.setMinutes(cursor.getMinutes() + 1);
  
    // Evita millones de vueltas (fechas mal leídas / rango enorme) → timeout de Apps Script y entrega a medias.
    const MAX_ITER = 500000;
    let iter = 0;
    while (cursor.getTime() < finMs) {
      if (++iter > MAX_ITER) return -1;
      const diaSemana = cursor.getDay();
      const hora = cursor.getHours();
  
      if (diaSemana !== 0 && diaSemana !== 6) {
        if (hora >= 8 && hora < 18) {
          if (hora !== 13) {
            minutosHabiles++;
          }
        }
      }
      cursor.setTime(cursor.getTime() + 60000);
    }
    return minutosHabiles;
  }
  
  function calcularTiempoNetoInterno(valInicio, valFin) {
    if (!valInicio || !valFin) return "ERR";
    const fechaInicio = convertirTextoAFecha(valInicio);
    const fechaFin = convertirTextoAFecha(valFin);
    if (!fechaInicio || !fechaFin) return "ERR";
  
    // Calcular diferencia entre fecha de inicio y fecha de fin
    const minutosHabiles = calcularMinutosHabiles(fechaInicio, fechaFin);
    if (minutosHabiles < 0) return "ERR";
  
    let horas = Math.floor(minutosHabiles / 60);
    let minutos = minutosHabiles % 60;
  
    return horas + (minutos / 100);
  }
  
  function calcularTiempoFila(hoja, fila, ahora) {
    if (hoja.getName() !== 'Fabricación') return;
    // Columna 9 = fecha de inicio (se establece cuando pasa a FABRICANDO)
    // Columna 10 = fecha de fin (se establece cuando pasa a ENTREGADO)
    let valInicio = hoja.getRange(fila, 9).getValue();
    let valFin = hoja.getRange(fila, 10).getValue();
    
    // Si se proporciona 'ahora' y la columna 10 está vacía, usar 'ahora' directamente
    // para evitar problemas de propagación en Google Sheets cuando se acaba de escribir
    if (ahora && (!valFin || String(valFin).trim() === "")) {
      valFin = ahora;
    }
  
    const fechaInicio = convertirTextoAFecha(valInicio);
    const fechaFin = convertirTextoAFecha(valFin);
    
    if (fechaInicio && fechaFin) {
      // Calcular diferencia entre columna 9 (inicio) y columna 10 (fin)
      const minutosHabiles = calcularMinutosHabiles(fechaInicio, fechaFin);
      if (minutosHabiles < 0) {
        hoja.getRange(fila, 14).setValue("ERR");
        return;
      }
      let horas = Math.floor(minutosHabiles / 60);
      let minutos = minutosHabiles % 60;
      hoja.getRange(fila, 14).setValue(horas + (minutos / 100)).setNumberFormat("0.00");
    } else {
      hoja.getRange(fila, 14).setValue("ERR");
    }
  }
  
  /** Tiempos col 14 en entrega selectiva Fabricación: flush + una fila no tumba el lote ni impide Remate. */
  function _aplicarTiemposEntregaSelectivaFab_(hojaFabricacion, filasOrdenadas, momento) {
    SpreadsheetApp.flush();
    for (const r of filasOrdenadas) {
      try {
        calcularTiempoFila(hojaFabricacion, r, momento);
      } catch (eT) {
        try { hojaFabricacion.getRange(r, 14).setValue("ERR"); } catch (e2) { }
      }
    }
    SpreadsheetApp.flush();
  }
  
  function calcularTiempoRemate(hoja, fila, ahora) {
    if (hoja.getName() !== 'Remate') return;
    // En Remate: col 8 = fecha inicio (al pasar a EN REMATE), col 9 = fecha fin (al pasar a ENTREGADO)
    let valInicio = hoja.getRange(fila, 8).getValue();
    let valFin = hoja.getRange(fila, 9).getValue();
  
    // Usar 'ahora' como fecha fin inmediata si aún no está escrita
    if (ahora && (!valFin || String(valFin).trim() === "")) {
      valFin = ahora;
    }
  
    const fechaInicio = convertirTextoAFecha(valInicio);
    const fechaFin = convertirTextoAFecha(valFin);
  
    if (fechaInicio && fechaFin) {
      const minutosHabiles = calcularMinutosHabiles(fechaInicio, fechaFin);
      let horas = Math.floor(minutosHabiles / 60);
      let minutos = minutosHabiles % 60;
      hoja.getRange(fila, 13).setValue(horas + (minutos / 100)).setNumberFormat("0.00");
    } else {
      hoja.getRange(fila, 13).setValue("ERR");
    }
  }
  
  function calcularTiempoLimpieza(hoja, fila, ahora) {
    if (hoja.getName() !== 'Limpieza') return;
    // En Limpieza: col 8 = fecha inicio (EN LIMPIEZA), col 9 = fecha fin (ENTREGADO)
    let valInicio = hoja.getRange(fila, 8).getValue();
    let valFin = hoja.getRange(fila, 9).getValue();
  
    if (ahora && (!valFin || String(valFin).trim() === "")) {
      valFin = ahora;
    }
  
    const fechaInicio = convertirTextoAFecha(valInicio);
    const fechaFin = convertirTextoAFecha(valFin);
  
    if (fechaInicio && fechaFin) {
      const minutosHabiles = calcularMinutosHabiles(fechaInicio, fechaFin);
      let horas = Math.floor(minutosHabiles / 60);
      let minutos = minutosHabiles % 60;
      hoja.getRange(fila, 13).setValue(horas + (minutos / 100)).setNumberFormat("0.00");
    } else {
      hoja.getRange(fila, 13).setValue("ERR");
    }
  }
  
  function recalcularTotalDelDia(filaForzada, kgEntregadoAhora) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hF = ss.getSheetByName("Fabricación");
    const hD = ss.getSheetByName("Dashboard");
    const hH = ss.getSheetByName("Historico") || ss.getSheetByName("Histórico");
    if (!hF || !hD || !hH) return;
  
    const ahora = new Date();
    const hoyStr = Utilities.formatDate(ahora, "GMT-4", "yyyy-MM-dd");
    let totalKilosHoy = 0;
  
    let data = hF.getDataRange().getValues();
    let colores = hF.getDataRange().getFontColors();
    // En Fabricación: col 7 = estado (índice 6), col 5 = peso (índice 4), col 10 = fecha fin entrega (índice 9)
    const IDX_ESTADO = 6;
    const IDX_PESO = 4;
    const IDX_FECHA_FIN = 9;
    if (filaForzada && filaForzada <= data.length) {
      const idx = filaForzada - 1;
      const filaViva = hF.getRange(filaForzada, 1, 1, 18).getValues()[0];
      data[idx][IDX_ESTADO] = filaViva[IDX_ESTADO] || data[idx][IDX_ESTADO];
      if (!data[idx][IDX_FECHA_FIN]) data[idx][IDX_FECHA_FIN] = filaViva[IDX_FECHA_FIN] || ahora;
      let pesoRaw = data[idx][IDX_PESO];
      if (!pesoRaw) pesoRaw = hF.getRange(filaForzada, 5).getValue();
      data[idx][IDX_PESO] = pesoRaw;
    }
    for (let i = 1; i < data.length; i++) {
      const estado = String(data[i][IDX_ESTADO] || "").toUpperCase().trim();
      const kilos = parseFloat(data[i][IDX_PESO] || 0);
      const fechaFinRaw = data[i][IDX_FECHA_FIN];
      const colorFila = colores[i] && colores[i][0] ? colores[i][0] : "";
      const esHijoForzado = filaForzada && i === filaForzada - 1;
  
      if (colorFila !== '#999999' && !esHijoForzado) continue;
      if (estado === "ENTREGADO" || estado === "ENTREGA CON OBSERVACION") {
        let sumar = false;
        const fFin = convertirTextoAFecha(fechaFinRaw);
        if (fFin) {
          if (Utilities.formatDate(fFin, "GMT-4", "yyyy-MM-dd") === hoyStr) sumar = true;
        } else if (String(fechaFinRaw).includes(hoyStr)) {
          sumar = true;
        }
        if (sumar) totalKilosHoy += kilos;
      }
    }
  
    // Fila nueva de entrega parcial puede no estar en getDataRange() aún: sumarla explícitamente
    if (filaForzada && filaForzada > data.length) {
      const filaVal = hF.getRange(filaForzada, 1, 1, 18).getValues()[0];
      const est = String(filaVal[IDX_ESTADO] || "").toUpperCase().trim();
      const kg = parseFloat(filaVal[IDX_PESO] || 0);
      const fFinRaw = filaVal[IDX_FECHA_FIN];
      if ((est === "ENTREGADO" || est === "ENTREGA CON OBSERVACION") && kg > 0) {
        let sumar = false;
        const fFin = convertirTextoAFecha(fFinRaw);
        if (fFin && Utilities.formatDate(fFin, "GMT-4", "yyyy-MM-dd") === hoyStr) sumar = true;
        if (!fFin && String(fFinRaw).includes(hoyStr)) sumar = true;
        if (sumar) totalKilosHoy += kg;
      }
    }
  
    actualizarCeldaHistorico(hH, ahora, totalKilosHoy);
    hD.getRange("B2").setValue(totalKilosHoy);
    hD.getRange("B1").setValue("Act: " + Utilities.formatDate(ahora, "GMT-4", "HH:mm"));
    actualizarGraficosDashboard(hH, hD, totalKilosHoy, ahora);
  }
  
  function actualizarCeldaHistorico(hH, fecha, nuevoTotal) {
    const fechaStr = Utilities.formatDate(fecha, "GMT-4", "dd/MM/yyyy");
    const data = hH.getRange("A:A").getValues();
    let filaEncontrada = -1;
    let meta = 20000;
  
    for (let i = 1; i < data.length; i++) {
      const f = convertirTextoAFecha(data[i][0]);
      if (f && Utilities.formatDate(f, "GMT-4", "dd/MM/yyyy") === fechaStr) {
        filaEncontrada = i + 1;
        break;
      }
    }
  
    // 1. Escribir datos (Descendente, Fila 2 = Nuevo)
    if (filaEncontrada > 0) {
      hH.getRange(filaEncontrada, 2).setValue(nuevoTotal);
      hH.getRange(filaEncontrada, 4).setValue(nuevoTotal / meta).setNumberFormat("0.00%");
    } else {
      hH.insertRows(2);
      hH.getRange(2, 1).setValue(fecha).setNumberFormat("dd/mm/yyyy");
      hH.getRange(2, 2).setValue(nuevoTotal);
      hH.getRange(2, 3).setValue(meta);
      hH.getRange(2, 4).setValue(nuevoTotal / meta).setNumberFormat("0.00%");
    }
  
    // 2. ORDENAR TABLA DESCENDENTE (Lo nuevo arriba)
    // Esto asegura tu requisito de la tabla.
    const rangoDatos = hH.getRange(2, 1, hH.getLastRow() - 1, 4);
    rangoDatos.sort({ column: 1, ascending: false });
  
    // 3. FIX GRÁFICO: Invertir eje horizontal para que se vea bien
    try {
      const charts = hH.getCharts();
      if (charts.length > 0) {
        const chart = charts[0];
        // hAxis.direction -1 hace que el gráfico vaya "al revés" de la tabla
        // (Es decir: Izquierda=Viejo, Derecha=Nuevo)
        const newChart = chart.modify()
          .setOption('hAxis.direction', -1)
          .build();
        hH.updateChart(newChart);
      }
    } catch (e) {
      // Si falla (no hay gráfico), no pasa nada
    }
  }
  
  function actualizarGraficosDashboard(hH, hD, kgHoy, ahora) {
    const hoyStr = Utilities.formatDate(ahora, "GMT-4", "yyyy-MM-dd");
    let mes = ahora.getMonth(),
      anio = ahora.getFullYear();
    let dSem = ahora.getDay();
    dSem = (dSem === 0) ? 7 : dSem;
    const lun = new Date(ahora);
    lun.setDate(ahora.getDate() - dSem + 1);
    lun.setHours(0, 0, 0, 0);
    const dom = new Date(lun);
    dom.setDate(lun.getDate() + 6);
    dom.setHours(23, 59, 59, 999);
    let kgSem = 0,
      kgMes = 0;
    let desglose = [0, 0, 0, 0, 0, 0, 0];
    let meta = 20000;
    const ult = hH.getLastRow();
    if (ult >= 2) {
      const d = hH.getRange(2, 1, ult - 1, 3).getValues();
      if (d.length > 0) {
        let m = d[0][2];
        if (m) meta = parseFloat(m);
      }
      for (let i = 0; i < d.length; i++) {
        let f = convertirTextoAFecha(d[i][0]);
        let k = parseFloat(d[i][1] || 0);
        if (f) {
          if (Utilities.formatDate(f, "GMT-4", "yyyy-MM-dd") === hoyStr) k = kgHoy;
          if (f.getMonth() === mes && f.getFullYear() === anio) kgMes += k;
          if (f >= lun && f <= dom) {
            kgSem += k;
            let idx = (f.getDay() === 0) ? 6 : f.getDay() - 1;
            desglose[idx] = k;
          }
        }
      }
    } else {
      kgSem = kgHoy;
      kgMes = kgHoy;
      desglose[dSem - 1] = kgHoy;
    }
    hD.getRange("B5").setValue(kgSem);
    hD.getRange("B6").setValue(kgMes);
    hD.getRange("E2:E8").setValues(desglose.map(v => [v]));
    hD.getRange("F2:F8").setValue(meta);
    let div = (dSem <= 5) ? dSem : 5;
    if (dSem >= 6 && (desglose[5] > 0 || (dSem === 6 && kgHoy > 0))) div += 1;
    hD.getRange("E9").setValue(kgSem / (div || 1));
  }
  
  function convertirTextoAFecha(valor) {
    if (!valor) return null;
    if (valor instanceof Date) return valor;
    const str = String(valor).trim();
    // Soporta strings como: "10:30am 30/03/26" (yy) o "10:30am 30/03/2026" (yyyy)
    const regex = /(\d{1,2})[:\.](\d{2})\s*([ap][\.]?m[\.]?)\.?\s+(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/i;
    const match = str.match(regex);
    if (match) {
      let h = parseInt(match[1]);
      let m = parseInt(match[2]);
      let ampm = match[3].toLowerCase().replace(/\./g, '');
      let d = parseInt(match[4]);
      let mes = parseInt(match[5]) - 1;
      let yRaw = parseInt(match[6], 10);
      // Si el año viene con 2 dígitos, asumir siglo razonable.
      // Regla simple: 00-69 => 2000-2069, 70-99 => 1970-1999.
      let y = (match[6].length === 2)
        ? (yRaw <= 69 ? 2000 + yRaw : 1900 + yRaw)
        : yRaw;
      if (ampm.includes('p') && h < 12) h += 12;
      if (ampm.includes('a') && h === 12) h = 0;
      return new Date(y, mes, d, h, m, 0);
    }
    const fechaStd = new Date(str);
    if (!isNaN(fechaStd.getTime())) return fechaStd;
    return null;
  }
  
  function procesarInformeTekla() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hO = ss.getSheetByName("ImportarTekla"),
      hD = ss.getSheetByName("BaseDespiece");
    if (!hO || !hD) return;
    const d = hO.getDataRange().getValues();
    let clean = [];
    for (let i = 1; i < d.length; i++) {
      let p = String(d[i][17] || "").trim(),
        c = String(d[i][12] || "").trim();
      if (p && c) clean.push([p, c, d[i][8], d[i][14], d[i][15]]);
    }
    let obj = {};
    clean.forEach(f => obj[f[0] + "|" + f[1]] = f);
    let final = Object.values(obj);
    hD.clearContents();
    hD.getRange(1, 1, 1, 5).setValues([
      ["Código Planificación", "Código Conjunto", "Cantidad", "Peso Unitario", "Peso Total"]
    ]);
    if (final.length > 0) hD.getRange(2, 1, final.length, 5).setValues(final);
  }
  
  function sincronizarEstadoMadre(ss, hoja, filaHijo, nombreHoja, ahora, omitirTraspasoSiYaHecho, omitirTraspasoFabricacion) {
    const codigoPlan = String(hoja.getRange(filaHijo, 1).getValue()).trim();
    const datos = hoja.getDataRange().getValues();
    const colores = hoja.getRange(1, 1, datos.length, 1).getFontColors();
    let colEstado = 6;
    let colFInicio = 7;
    // Ajuste por hoja:
    // - Técnica / Remate: estado en col 7 (índice 6), inicio en col 8 (índice 7)
    // - Fabricación: estado también en col 7 (índice 6), pero inicio en col 9 (índice 8)
    if (nombreHoja === 'Fabricación') {
      colFInicio = 8; // índice 8 → columna 9
    }
    // Para Remate no se cambia colEstado: sigue siendo índice 6 (columna 7)
    let filaMadre = -1;
    let idxHijo = filaHijo - 1;
    for (let i = idxHijo; i >= 1; i--) {
      if (String(datos[i][0]).trim() === codigoPlan && colores[i][0] !== "#999999") {
        filaMadre = i + 1;
        break;
      }
    }
    if (filaMadre === -1) return;
    let totalHijos = 0,
      hFab = 0,
      hEnt = 0;
    for (let i = filaMadre; i < datos.length; i++) {
      if (colores[i][0] !== "#999999") break;
      totalHijos++;
      let est = String(datos[i][colEstado]).toUpperCase().trim();
      if (est === "ENTREGADO") hEnt++;
      else if (est === "FABRICANDO" || est === "REPARACION") hFab++;
    }
    const rMadre = hoja.getRange(filaMadre, colEstado + 1);
    const estMadre = String(rMadre.getValue()).toUpperCase();
    if (hFab > 0 && estMadre !== "FABRICANDO" && estMadre !== "REPARACION") {
      PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(new Date().getTime()));
      rMadre.setValue("FABRICANDO");
      if (hoja.getRange(filaMadre, colFInicio + 1).getValue() === "")
        hoja.getRange(filaMadre, colFInicio + 1).setValue(ahora);
    }
    // En Remate, no cerrar la madre hasta que TODOS los hijos esperados (los de Fabricación) estén en estado ENTREGADO.
    // Esto evita marcar la madre en Remate como ENTREGADO cuando solo llegaron algunos hijos (entregas parciales).
    let permitirCerrarMadre = true;
    if (nombreHoja === 'Remate') {
      try {
        const hFab = ss.getSheetByName("Fabricación");
        if (hFab) {
          const datosFab = hFab.getDataRange().getValues();
          const coloresFab = hFab.getRange(1, 1, datosFab.length, 1).getFontColors();
          let hijosEsperados = 0;
          for (let i = 1; i < datosFab.length; i++) {
            if (String(datosFab[i][0]).trim() !== codigoPlan) continue;
            if (coloresFab[i][0] === "#999999") hijosEsperados++;
          }
          // Si hay hijos esperados y aún no alcanzamos ese total en Remate ENTREGADO, no cerrar madre
          if (hijosEsperados > 0 && hEnt < hijosEsperados) permitirCerrarMadre = false;
        }
      } catch (eRemSync) { }
    }
    else if (nombreHoja === 'Limpieza') {
      try {
        const hRem = ss.getSheetByName("Remate");
        if (hRem) {
          const datosRem = hRem.getDataRange().getValues();
          const coloresRem = hRem.getRange(1, 1, datosRem.length, 1).getFontColors();
          let hijosEsperadosRem = 0;
          for (let i = 1; i < datosRem.length; i++) {
            if (String(datosRem[i][0]).trim() !== codigoPlan) continue;
            if (coloresRem[i][0] === "#999999") hijosEsperadosRem++;
          }
          // Si faltan hijos por llegar desde Remate, no cerrar madre en Limpieza
          if (hijosEsperadosRem > 0 && hEnt < hijosEsperadosRem) permitirCerrarMadre = false;
        }
      } catch (eLimpSync) { }
    }
  
    if (hEnt === totalHijos && totalHijos > 0 && estMadre !== "ENTREGADO" && permitirCerrarMadre) {
      PropertiesService.getScriptProperties().setProperty("edicionProgramatica", String(new Date().getTime()));
      rMadre.setValue("ENTREGADO");
      if (nombreHoja === 'Fabricación') {
        const valorQC = hoja.getRange(filaHijo, 15).getValue();
        hoja.getRange(filaMadre, 15).setValue(valorQC);
      }
      if (!(nombreHoja === 'Técnica' && omitirTraspasoSiYaHecho)) {
        // Entrega selectiva: el traspaso Fab→Remate va aparte (una sola vez); aquí solo acciones locales (ej. col K madre).
        const optsFab =
          nombreHoja === "Fabricación" && omitirTraspasoFabricacion ? { skipTraspaso: true } : undefined;
        ejecutarAccionesEntregado(ss, hoja, filaMadre, nombreHoja, ahora, optsFab);
      }
      // FIX MADRE: Calcular también el tiempo de la madre
      if (nombreHoja === 'Fabricación') {
        calcularTiempoFila(hoja, filaMadre, ahora);
      }
    }
  }
  
  
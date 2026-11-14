/**
 * Lógica compartida de los formularios de inscripción de actividades.
 *
 * Una pregunta (guardada dentro del JSON `preguntas` del formulario) tiene:
 *   clave            identificador estable (las respuestas se guardan por clave)
 *   tipo             ver TIPOS
 *   etiqueta, ayuda, requerida
 *   opciones         string[]  (unica / lista / multiple)
 *   depende_de       clave de otra pregunta; solo se muestra si esa pregunta…
 *   depende_valores  …tiene alguno de estos valores (vacío = "tiene cualquier respuesta").
 *                    Si la pregunta padre es de tipo persona: 'registrada' | 'nueva'.
 *   pregunta_persona clave de una pregunta tipo persona a la que se enlaza este campo
 *   campo_persona    columna de `personas` que representa (ver CAMPOS_PERSONA).
 *                    Si se eligió una persona registrada, el campo se oculta y el
 *                    servidor lo llena con el dato de su ficha; si es una persona
 *                    nueva, se pide al usuario.
 *   permitir_nuevo   (persona) permitir ingresar una persona que no esté registrada
 *   filtro_grupos    (persona) limitar la búsqueda a estos grupos (ids)
 */

const TIPOS = ['seccion', 'texto', 'parrafo', 'numero', 'fecha', 'unica', 'lista', 'multiple', 'persona'];
const TIPOS_CON_OPCIONES = ['unica', 'lista', 'multiple'];

const SEXO = { M: 'Masculino', F: 'Femenino' };

// Columnas de `personas` que se pueden enlazar a una pregunta
const CAMPOS_PERSONA = {
  celular:             { etiqueta: 'Celular' },
  telefono:            { etiqueta: 'Teléfono' },
  email:               { etiqueta: 'Correo electrónico' },
  fechanacimiento:     { etiqueta: 'Fecha de nacimiento' },
  sexo:                { etiqueta: 'Sexo' },
  estado_civil:        { etiqueta: 'Estado civil' },
  nodocumento:         { etiqueta: 'No. de documento' },
  direccion_domicilio: { etiqueta: 'Dirección de domicilio' },
  zona_domicilio:      { etiqueta: 'Zona de domicilio' },
  lugartrabajo:        { etiqueta: 'Lugar de trabajo' },
  puesto_trabajo:      { etiqueta: 'Puesto de trabajo' },
};

const MAX_PREGUNTAS = 100;

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Valida y normaliza el arreglo de preguntas enviado por el editor. Lanza Error con mensaje legible. */
function normalizarPreguntas(raw) {
  if (!Array.isArray(raw)) throw new Error('Las preguntas deben ser un arreglo');
  if (raw.length > MAX_PREGUNTAS) throw new Error(`Máximo ${MAX_PREGUNTAS} preguntas por formulario`);

  const claves = new Set();
  const preguntas = raw.map((p, i) => {
    const clave = str(p?.clave, 40);
    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(clave)) throw new Error(`Pregunta ${i + 1}: clave inválida`);
    if (claves.has(clave)) throw new Error(`Pregunta ${i + 1}: clave duplicada`);
    claves.add(clave);

    const tipo = p.tipo;
    if (!TIPOS.includes(tipo)) throw new Error(`Pregunta ${i + 1}: tipo inválido`);

    const etiqueta = str(p.etiqueta, 500);
    if (!etiqueta) throw new Error(`Pregunta ${i + 1}: el texto de la pregunta es requerido`);

    const q = {
      clave, tipo, etiqueta,
      ayuda:     str(p.ayuda, 1000),
      requerida: tipo !== 'seccion' && !!p.requerida,
      opciones:  [],
      depende_de:       null,
      depende_valores:  [],
      pregunta_persona: null,
      campo_persona:    null,
    };

    if (TIPOS_CON_OPCIONES.includes(tipo)) {
      const ops = (Array.isArray(p.opciones) ? p.opciones : [])
        .map(o => str(o, 200)).filter(Boolean);
      const unicas = [...new Set(ops)];
      if (!unicas.length) throw new Error(`Pregunta "${etiqueta}": agregue al menos una opción`);
      q.opciones = unicas.slice(0, 100);
    }

    if (tipo === 'persona') {
      q.permitir_nuevo = !!p.permitir_nuevo;
      q.filtro_grupos  = (Array.isArray(p.filtro_grupos) ? p.filtro_grupos : [])
        .map(Number).filter(n => Number.isInteger(n) && n > 0);
    }

    if (p.depende_de) {
      q.depende_de = str(p.depende_de, 40);
      q.depende_valores = (Array.isArray(p.depende_valores) ? p.depende_valores : [])
        .map(v => str(v, 200)).filter(Boolean);
    }

    if (p.pregunta_persona && p.campo_persona && tipo !== 'seccion' && tipo !== 'persona') {
      if (!CAMPOS_PERSONA[p.campo_persona]) throw new Error(`Pregunta "${etiqueta}": campo de persona inválido`);
      q.pregunta_persona = str(p.pregunta_persona, 40);
      q.campo_persona    = p.campo_persona;
    }
    return q;
  });

  // Referencias: solo hacia preguntas anteriores (evita ciclos)
  const previas = new Map();
  for (const q of preguntas) {
    if (q.depende_de) {
      const padre = previas.get(q.depende_de);
      if (!padre) throw new Error(`Pregunta "${q.etiqueta}": solo puede depender de una pregunta anterior`);
      if (padre.tipo === 'seccion') throw new Error(`Pregunta "${q.etiqueta}": no puede depender de un título de sección`);
    }
    if (q.pregunta_persona) {
      const pp = previas.get(q.pregunta_persona);
      if (!pp || pp.tipo !== 'persona') {
        throw new Error(`Pregunta "${q.etiqueta}": debe enlazarse a una pregunta de persona anterior`);
      }
    }
    previas.set(q.clave, q);
  }
  return preguntas;
}

function tieneValor(v) {
  if (v === null || v === undefined) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return !!v.modo;
  return String(v).trim() !== '';
}

/** ¿La pregunta se muestra con las respuestas actuales? (misma regla que el frontend) */
function esVisible(q, respuestas, porClave, prof = 0) {
  if (prof > 50) return false;
  if (q.depende_de) {
    const padre = porClave.get(q.depende_de);
    if (!padre || !esVisible(padre, respuestas, porClave, prof + 1)) return false;
    const val = respuestas[padre.clave];
    if (!tieneValor(val)) return false;
    if (q.depende_valores?.length) {
      let actuales;
      if (padre.tipo === 'persona')       actuales = [val.modo];
      else if (Array.isArray(val))        actuales = val.map(String);
      else                                actuales = [String(val)];
      if (!q.depende_valores.some(v => actuales.includes(v))) return false;
    }
  }
  if (q.pregunta_persona) {
    const pp = porClave.get(q.pregunta_persona);
    if (!pp || !esVisible(pp, respuestas, porClave, prof + 1)) return false;
    // Solo se pide al usuario cuando la persona es nueva
    if (respuestas[pp.clave]?.modo !== 'nueva') return false;
  }
  return true;
}

/** Convierte el valor de la ficha de persona al formato de la pregunta */
function valorDesdePersona(campo, valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (campo === 'sexo') return SEXO[valor] || valor;
  if (campo === 'fechanacimiento') {
    if (valor instanceof Date) {
      const p = n => String(n).padStart(2, '0');
      return `${valor.getFullYear()}-${p(valor.getMonth() + 1)}-${p(valor.getDate())}`;
    }
    return String(valor).slice(0, 10);
  }
  return String(valor);
}

/** Convierte una respuesta al formato de la columna de personas (al registrar persona nueva) */
function valorHaciaPersona(campo, valor) {
  if (!tieneValor(valor)) return null;
  const v = Array.isArray(valor) ? valor.join(', ') : String(valor).trim();
  if (campo === 'sexo') {
    const k = Object.keys(SEXO).find(k => SEXO[k].toLowerCase() === v.toLowerCase() || k === v.toUpperCase());
    return k || null;
  }
  if (campo === 'fechanacimiento') return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  return v.slice(0, 340);
}

/**
 * Valida las respuestas enviadas contra las preguntas. Devuelve { limpias, personasRegistradas }
 * donde personasRegistradas = [{ clave, idpersonas }] a verificar en BD. Lanza Error si algo falta.
 */
function validarRespuestas(preguntas, entrada) {
  const respuestas = entrada && typeof entrada === 'object' && !Array.isArray(entrada) ? entrada : {};
  const porClave = new Map(preguntas.map(q => [q.clave, q]));
  const limpias = {};
  const personasRegistradas = [];

  // Primero se normaliza cada valor por tipo para que la visibilidad se evalúe sobre datos limpios
  const norm = {};
  for (const q of preguntas) {
    const v = respuestas[q.clave];
    if (v === undefined || v === null) continue;
    switch (q.tipo) {
      case 'texto':   norm[q.clave] = str(String(v), 2000); break;
      case 'parrafo': norm[q.clave] = str(String(v), 5000); break;
      case 'numero': {
        const s = String(v).trim();
        if (s === '') break;
        const n = Number(s);
        if (!Number.isFinite(n)) throw new Error(`"${q.etiqueta}": debe ser un número`);
        norm[q.clave] = n;
        break;
      }
      case 'fecha': {
        const s = String(v).trim();
        if (s === '') break;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(`"${q.etiqueta}": fecha inválida`);
        norm[q.clave] = s;
        break;
      }
      case 'unica':
      case 'lista': {
        const s = String(v);
        if (s === '') break;
        if (!q.opciones.includes(s)) throw new Error(`"${q.etiqueta}": opción inválida`);
        norm[q.clave] = s;
        break;
      }
      case 'multiple': {
        const arr = (Array.isArray(v) ? v : [v]).map(String);
        if (arr.some(x => !q.opciones.includes(x))) throw new Error(`"${q.etiqueta}": opción inválida`);
        norm[q.clave] = q.opciones.filter(o => arr.includes(o)); // orden de las opciones, sin duplicados
        break;
      }
      case 'persona': {
        if (typeof v !== 'object' || Array.isArray(v)) break;
        if (v.modo === 'registrada') {
          const id = Number(v.idpersonas);
          if (!Number.isInteger(id) || id <= 0) throw new Error(`"${q.etiqueta}": persona inválida`);
          norm[q.clave] = { modo: 'registrada', idpersonas: id };
        } else if (v.modo === 'nueva') {
          if (!q.permitir_nuevo) throw new Error(`"${q.etiqueta}": debe seleccionar una persona registrada`);
          norm[q.clave] = {
            modo: 'nueva',
            primer_nombre:    str(v.primer_nombre, 145),
            segundo_nombre:   str(v.segundo_nombre, 145),
            primer_apellido:  str(v.primer_apellido, 145),
            segundo_apellido: str(v.segundo_apellido, 145),
          };
        }
        break;
      }
    }
  }

  for (const q of preguntas) {
    if (q.tipo === 'seccion') continue;
    if (!esVisible(q, norm, porClave)) continue;
    const v = norm[q.clave];
    if (!tieneValor(v)) {
      if (q.requerida) throw new Error(`"${q.etiqueta}" es requerida`);
      continue;
    }
    if (q.tipo === 'persona' && v.modo === 'nueva' && (!v.primer_nombre || !v.primer_apellido)) {
      throw new Error(`"${q.etiqueta}": ingrese al menos primer nombre y primer apellido`);
    }
    if (q.tipo === 'persona' && v.modo === 'registrada') personasRegistradas.push({ clave: q.clave, idpersonas: v.idpersonas });
    limpias[q.clave] = v;
  }
  return { limpias, personasRegistradas };
}

const EMAIL_RE = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]{2,}$/;
const MAX_CORREOS_ORGANIZADORES = 10;

/**
 * Valida la configuración de notificaciones por correo del formulario.
 * { inscrito: bool, pregunta_email: clave|null, correos: string[] } — todo opcional.
 */
function normalizarNotificaciones(raw, preguntas) {
  const n = raw && typeof raw === 'object' ? raw : {};
  const correos = (Array.isArray(n.correos) ? n.correos : String(n.correos || '').split(/[,;\s]+/))
    .map(c => String(c).trim().toLowerCase()).filter(Boolean);
  const unicos = [...new Set(correos)];
  const invalido = unicos.find(c => !EMAIL_RE.test(c) || c.length > 200);
  if (invalido) throw new Error(`Correo de organizador inválido: ${invalido}`);
  if (unicos.length > MAX_CORREOS_ORGANIZADORES) {
    throw new Error(`Máximo ${MAX_CORREOS_ORGANIZADORES} correos de organizadores`);
  }

  const inscrito = !!n.inscrito;
  let pregunta_email = null;
  if (inscrito) {
    const q = preguntas.find(p => p.clave === n.pregunta_email);
    if (!q || q.tipo !== 'texto') {
      throw new Error('Para enviar confirmación al inscrito elija la pregunta (texto corto) donde se escribe su correo');
    }
    pregunta_email = q.clave;
  }
  return { inscrito, pregunta_email, correos: unicos };
}

/** Texto legible de una respuesta (para correos). marcarNueva: añade "(nueva)" a personas no registradas. */
function textoRespuesta(q, v, marcarNueva = false) {
  if (!tieneValor(v)) return '';
  if (q.tipo === 'persona') {
    if (v.modo === 'registrada') return v.nombre || `#${v.idpersonas}`;
    const n = [v.primer_nombre, v.segundo_nombre, v.primer_apellido, v.segundo_apellido].filter(Boolean).join(' ');
    return marcarNueva ? `${n} (persona nueva)` : n;
  }
  if (Array.isArray(v)) return v.join(', ');
  if (q.tipo === 'fecha') {
    const [y, m, d] = String(v).split('-');
    return d ? `${d}/${m}/${y}` : String(v);
  }
  return String(v);
}

module.exports = {
  TIPOS, CAMPOS_PERSONA, SEXO, EMAIL_RE,
  normalizarPreguntas, normalizarNotificaciones, esVisible, validarRespuestas,
  valorDesdePersona, valorHaciaPersona, tieneValor, textoRespuesta,
};

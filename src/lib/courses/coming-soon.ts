// Clases y módulos «Pronto»: se anuncian en el temario pero todavía no tienen video.
// Se marcan desde el panel agregando «(Pronto)» al final del título de la clase.
// Un módulo sin clases también se muestra como «Pronto».
// No cuentan para el avance ni para la navegación entre clases.

const MARK = /\s*\(pronto\)\s*$/i;

/** ¿Esta clase está anunciada como «Pronto»? */
export function isComingSoon(title: string) {
  return MARK.test(title);
}

/** Título sin la marca «(Pronto)», para mostrarlo con una etiqueta aparte. */
export function cleanTitle(title: string) {
  return title.replace(MARK, "");
}

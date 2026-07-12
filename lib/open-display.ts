/* Buka layar display (TV) di tab baru — layar meminta fullscreen sendiri. */
export function openDisplay(url: string) {
  window.open(url, "_blank", "noopener")
}

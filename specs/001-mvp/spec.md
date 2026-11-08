# 001 — Nido MVP · Spec

> Una app para dos personas (hogar) que reúne **pendientes**, **agenda** y **presupuesto** en un solo lugar, funciona en iPhone, iPad y la web, y se sincroniza al instante.
> Mockup de referencia: canvas "Nido — mockup app de pendientes en pareja" (4 pantallas: Ahora, Pendientes, Agenda, Presupuesto).

## 1. Problema
Preparar la casa para la llegada de los niños genera decenas de compras, arreglos y trámites. Hoy no están documentados, se olvidan, se duplican y no se sabe cuánto se lleva gastado.

## 2. Principios de producto (no negociables)
1. **Capturar en ≤3 segundos.** Un solo campo de texto; todo lo demás es opcional y va detrás de "Más detalles".
2. **Una lista compartida.** No hay asignados ni dueños. Solo se registra *quién lo creó o registró* (avatar).
3. **Llamativa pero simple.** Tarjetas grandes, color por prioridad y tipo, botones ≥44 px, cero formularios largos.
4. **Sin depender del Calendario de Apple.** La agenda vive en la app; los avisos llegan por push.
5. **Tiempo real.** Lo que uno cambia, el otro lo ve en <2 s sin recargar.

## 3. Alcance
### Dentro (MVP = F0 + F1)
- Hogar compartido: crear hogar, invitar a la pareja con un código, inicio de sesión con **código de 6 dígitos por correo**.
- Pendientes: crear, editar, completar, reabrir y eliminar; tipo, prioridad, área, precio estimado/real, link, nota, foto.
- Presupuesto: bolsas, sumar/restar con teclado numérico y movimientos.
- Vínculo compra ↔ presupuesto: al completar una compra se ofrece restarla de una bolsa.
- Agenda: eventos con fecha y hora, lugar, nota y pendiente vinculado opcional; aviso push X min antes (60 por defecto).
- Pantalla "Ahora": progreso, bolsa principal, urgentes y próximos 2 eventos.
- PWA instalable (iOS 16.4+ para push) y modo oscuro automático.

### Fuera (explícito)
- Asignar pendientes a personas, subtareas, recurrencias.
- Sincronizar con Google o Apple Calendar.
- Edición offline con cola de sincronización (la app funciona de solo lectura sin red y muestra un aviso).
- Multi-moneda (solo MXN) y reportes o gráficas de gasto.
- Más de 4 miembros por hogar.

## 4. Historias y criterios de aceptación

### H1 · Entrar y emparejar
- **Dado** un correo nuevo, **cuando** pido código, **entonces** recibo 6 dígitos y al ingresarlos entro sin salir de la PWA (nada de magic links: en iOS abren Safari, no la PWA).
- **Dado** que no tengo hogar, veo dos opciones: "Crear hogar" (nombre + mi nombre) o "Unirme con código".
- "Invitar" genera un código de 8 caracteres que vale 7 días y se usa una vez; la UI lo comparte con el share sheet nativo (`navigator.share`).
- Al unirse, el segundo miembro ve de inmediato todos los datos del hogar.

### H2 · Captura rápida
- El campo acepta tokens (en cualquier orden, sin distinguir mayúsculas ni acentos):
  - `$4500`, `$4,500`, `$4 500` o `$4500.50` → precio estimado y **tipo = compra**.
  - `!urgente` / `!u`, `!pronto` / `!p`, `!algun` / `!algún` / `!a` → prioridad (por defecto **pronto**).
  - `#arreglo` / `#compra` / `#tarea` → fuerza el tipo (gana sobre la inferencia por precio).
  - `@cuarto` o `@"cuarto niños"` → área.
- Sin precio ni `#tipo`, el tipo es **tarea**.
- Debajo del campo se ve una vista previa en vivo de los chips detectados.
- Enter o el botón "+" crea el pendiente; el campo se limpia y conserva el foco.
- Un título vacío después de quitar los tokens no crea nada.
- Implementación de referencia: `src/lib/quickAdd.ts` (con pruebas).

### H3 · Lista de pendientes
- Agrupada por prioridad (Urgente → Pronto → Algún día); dentro de cada grupo, pendientes primero y hechos después (opacidad 55% y tachado).
- Filtro segmentado: Todo · Compras · Arreglos · Tareas. Filtro por área opcional con chips.
- El círculo de 44 px a la derecha completa o reabre. Tocar la tarjeta abre el detalle (bottom sheet) para editar.
- Al pie: **"Compras pendientes: $X"** (suma del precio estimado de las compras no hechas).
- Los hechos de hace más de 14 días se ocultan detrás de "Ver hechos (N)".

### H4 · Completar una compra
- Al completar un pendiente de tipo compra aparece un sheet con: precio real (prellenado con el estimado), bolsa (la última usada) y los botones **"Restar de [bolsa]"** y **"Solo marcar hecho"**.
- Todo ocurre en una sola transacción (RPC `complete_item`): marca hecho, crea un movimiento negativo y los enlaza.
- Reabrir un pendiente (RPC `reopen_item`) borra el movimiento vinculado; el saldo regresa.

### H5 · Presupuesto
- Bolsas como pills; "+ Nueva bolsa" pide nombre y monto inicial (crea un movimiento positivo "Monto inicial").
- La tarjeta muestra **Disponible** (aportado − gastado, puede ser negativo y entonces va en rojo), una barra de gastado/aportado y ambos totales.
- Dos botones grandes: **Gasté** (resta) y **Agregué** (suma). Abren un sheet con:
  - el monto en grande (signo y color según el modo);
  - concepto opcional;
  - atajos +100, +500, +1,000 y +5,000 (se acumulan);
  - un teclado 1–9, 00, 0, ⌫ (máximo 7 dígitos, sin centavos en la UI);
  - un botón confirmar "Restar $X" / "Sumar $X", deshabilitado mientras el monto sea 0.
- La lista de movimientos (más recientes primero) muestra avatar, concepto, fecha relativa y monto con signo y color. Deslizar a la izquierda elimina con opción de deshacer durante 5 s.
- Los montos se guardan en **centavos (bigint)** y nunca en float.

### H6 · Agenda
- Una tira de 7 días a partir de hoy, deslizable a semanas siguientes. Cada día con eventos lleva un punto.
- El día seleccionado muestra sus eventos con hora, duración, lugar y chip "Pendiente: X" si hay uno vinculado (lleva al pendiente). Debajo, "Después" lista los próximos 4.
- "Agregar al [día]" abre un sheet con título, hora (picker nativo), duración opcional, lugar, aviso (Sin aviso / 15 min / 1 h / 1 día) y vínculo a pendiente.
- **Push:** a los dos miembros les llega una notificación `remind_minutes` antes, una sola vez por evento (`reminded_at`). Si se edita la hora, `reminded_at` se resetea.

### H7 · Ahora
- Anillo: % de pendientes hechos sobre el total (excluye eliminados), con el texto "N de M hechos" y un chip "K urgentes por resolver".
- Tarjeta de la bolsa principal (la primera en `sort`) que lleva a Presupuesto.
- Hasta 3 urgentes no hechos (se completan desde ahí) y los 2 próximos eventos.
- Un FAB "+" abre la captura rápida en un sheet desde cualquier pestaña excepto Presupuesto.

### H8 · Fotos
- Una foto opcional por pendiente: cámara o galería (`<input type="file" accept="image/*" capture="environment">`).
- Se comprime en el cliente a ≤1280 px de lado mayor, WebP con calidad 0.8 (unos 150 KB) y se sube a Storage `photos/{household_id}/{item_id}.webp`.
- Se muestra como miniatura de 52 px en la tarjeta y a tamaño completo en el detalle. Sin foto, se ve el ícono del tipo sobre su tinte.

## 5. UX y diseño (tokens del mockup)
| Token | Valor |
|---|---|
| Fuente | Plus Jakarta Sans 400–800 |
| bg / card / border | `#F5F4FA` / `#FFFFFF` / `#ECEAF3` |
| ink / muted | `#1C1A2B` / `#6B6880` |
| primary | `#5B47E0` (hover `#4535B8`) |
| Urgente / Pronto / Algún día (punto) | `#E5484D` / `#F5A524` / `#9C99B0` |
| Compra (tinte/fg) | `#E9E6FD` / `#4535B8` |
| Arreglo | `#FFF4DE` / `#8A5300` |
| Tarea | `#E3F4EC` / `#1E6B4A` |
| Gasto / Abono | `#A61E25` sobre `#FDE8E8` / `#1E6B4A` sobre `#E3F4EC` |
| Radios | tarjeta 18–20, hero 26, sheet 28, botón 14–20 |
| Avatares | miembro 1 `#5B47E0`, miembro 2 `#F5A524` (se eligen al unirse) |

- Navegación: tab bar inferior de 4 pestañas (Ahora, Pendientes, Agenda, Presupuesto) con `safe-area-inset-bottom`.
- Sheets: bottom sheet con backdrop, que se cierra deslizando hacia abajo o con Esc.
- Feedback: `navigator.vibrate(10)` al completar (Android; iOS lo ignora sin romper nada) y una animación de check de 250 ms.
- Accesibilidad: contraste AA, `aria-label` en los botones de solo ícono y la tab bar como `<nav>`.
- iPad o pantallas de 768 px o más: Pendientes y Agenda en dos columnas y la tab bar como rail lateral.
- Idioma es-MX y formato `$38,450` (`Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0})`).

## 6. Métricas de éxito (personal)
- ≥90% de compras y arreglos capturados en la app durante 4 semanas.
- Ambos la abren al menos 3 veces por semana.
- El saldo de la bolsa "Bebé" coincide con la realidad (revisión mensual).

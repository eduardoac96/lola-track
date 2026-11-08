import type { ItemPriority, ItemType } from '../../data/items';

export interface ChecklistEntry {
  title: string;
  type: ItemType;
  priority: ItemPriority;
  area: string;
}

/** Plantilla "Checklist de llegada": sugerencias editables, sin precios (cada casa es distinta). */
export const ARRIVAL_CHECKLIST: readonly ChecklistEntry[] = [
  // Seguridad primero
  { title: 'Asegurar muebles a la pared', type: 'arreglo', priority: 'urgente', area: 'Toda la casa' },
  { title: 'Protectores de enchufes', type: 'compra', priority: 'urgente', area: 'Toda la casa' },
  { title: 'Seguros en cajones y gabinetes', type: 'compra', priority: 'urgente', area: 'Cocina' },
  { title: 'Revisar detector de humo', type: 'arreglo', priority: 'urgente', area: 'Toda la casa' },
  { title: 'Guardar químicos y medicinas en alto', type: 'tarea', priority: 'urgente', area: 'Toda la casa' },
  { title: 'Puertas de seguridad en escaleras', type: 'compra', priority: 'pronto', area: 'Toda la casa' },
  // Cuarto
  { title: 'Cuna', type: 'compra', priority: 'pronto', area: 'Cuarto niños' },
  { title: 'Colchón para cuna', type: 'compra', priority: 'pronto', area: 'Cuarto niños' },
  { title: 'Sábanas de cuna', type: 'compra', priority: 'pronto', area: 'Cuarto niños' },
  { title: 'Armar la cuna', type: 'tarea', priority: 'pronto', area: 'Cuarto niños' },
  { title: 'Cambiador', type: 'compra', priority: 'pronto', area: 'Cuarto niños' },
  { title: 'Monitor para bebé', type: 'compra', priority: 'pronto', area: 'Cuarto niños' },
  { title: 'Pintar cuarto de los niños', type: 'arreglo', priority: 'pronto', area: 'Cuarto niños' },
  { title: 'Cortinas que oscurezcan', type: 'compra', priority: 'algun_dia', area: 'Cuarto niños' },
  { title: 'Lámpara de noche', type: 'compra', priority: 'algun_dia', area: 'Cuarto niños' },
  { title: 'Organizar clóset', type: 'tarea', priority: 'algun_dia', area: 'Cuarto niños' },
  // Salidas
  { title: 'Silla para auto', type: 'compra', priority: 'urgente', area: 'Auto' },
  { title: 'Instalar silla en el auto', type: 'tarea', priority: 'pronto', area: 'Auto' },
  { title: 'Carriola', type: 'compra', priority: 'pronto', area: 'Salidas' },
  { title: 'Pañalera', type: 'compra', priority: 'pronto', area: 'Salidas' },
  // Baño y salud
  { title: 'Bañera', type: 'compra', priority: 'pronto', area: 'Baños' },
  { title: 'Termómetro', type: 'compra', priority: 'pronto', area: 'Baños' },
  { title: 'Botiquín básico', type: 'compra', priority: 'pronto', area: 'Baños' },
  { title: 'Revisar calentador', type: 'arreglo', priority: 'algun_dia', area: 'Baños' },
  // Papeleo
  { title: 'Elegir pediatra', type: 'tarea', priority: 'urgente', area: 'Papeleo' },
  { title: 'Agregar a los niños al seguro médico', type: 'tarea', priority: 'pronto', area: 'Papeleo' },
  { title: 'Lavar ropa de los niños', type: 'tarea', priority: 'algun_dia', area: 'Cuarto niños' },
];

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es-MX').replace(/\s+/g, ' ').trim();

/** Solo las sugerencias que el hogar aún no tiene (por título, sin acentos ni mayúsculas). */
export function missingFromChecklist(existingTitles: readonly string[]): ChecklistEntry[] {
  const have = new Set(existingTitles.map(norm));
  return ARRIVAL_CHECKLIST.filter((e) => !have.has(norm(e.title)));
}

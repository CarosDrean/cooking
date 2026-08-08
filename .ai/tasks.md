**Estado:** completado
**Resumen:**
- Archivos modificados:
  - `client/src/pages/Dashboard.tsx` — añadida stats-bar (4 stats: recetas, despensa, comidas planeadas, próx. caducidad), quick-actions (3 botones de acceso rápido: despensa, plan, recetas), tip card mejorado con header y botón de refresco (`tip.refetch()`).
  - `client/src/index.css` — añadidos estilos `.stats-bar`, `.stats-bar .stat-item`, `.stats-bar .stat-value`, `.stats-bar .stat-label`, `.quick-actions`, y actualizados `.tip-card`, `.tip-card-header`, `.tip-card-icon`, `.tip-card-title`.
- Decisiones tomadas:
  - Se usó `useExpiring(1)` para la stat de próxima caducidad (query independiente con key distinta).
  - `tip.refetch()` de React Query para refrescar el consejo diario (el hook `useDailyTip` ya tenía `staleTime: 0`).
  - Las clases `btn primary` y `btn` siguen la convención existente del proyecto (en lugar de `btn-primary`/`btn-secondary`).
  - Los selectores `.stats-bar .stat-value`/`.stat-label` se colocaron después de los standalone `.stat-value`/`.stat-label` en CSS para evitar el warning de descending specificity de Biome.
- Pruebas ejecutadas: `pnpm check` (typecheck + lint + security) — todo OK, 0 errores, 0 warnings.
- Pendientes: nada

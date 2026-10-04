# Reglas y Estándares del Proyecto: Finanzas Familiares

## 1. Estándares de Entradas Numéricas y Formularios
- **Sin Spin Buttons**: Todos los campos `input[type="number"]` deben mantener ocultos los botones de incremento/decremento nativos del navegador mediante las reglas globales de CSS (`-webkit-inner-spin-button`, `appearance: textfield`).
- **Bloqueo de Evento Wheel**: Ningún input numérico debe cambiar su valor mediante la rueda del ratón. Al agregar nuevos inputs numéricos, incluir `onWheel={e => e.target.blur()}` o verificar que el listener global de `App.jsx` capture el evento.
- **Tipado de Entradas Financieras**:
  - **Importes monetarios**: Utilizar `type="text"` con `inputMode="decimal"` junto a `normalizeDecimalInput()` y `formatInputDecimal()`.
  - **Enteros (días, cuotas)**: Utilizar `type="number"` con `min`/`max` y parsing con `parseIntNum()`.

## 2. Control de Versiones y Sincronización
- **Flujo de Git/GitHub**: Cuando se solicite actualizar el repositorio de GitHub:
  1. Verificar `git status` y `git diff`.
  2. Compilar con `npm run build` para asegurar cero errores de build.
  3. Ejecutar `git add`, generar commit con mensaje semántico convencional (`type(scope): description`) y hacer `git push origin main`.

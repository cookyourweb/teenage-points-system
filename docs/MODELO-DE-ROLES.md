# El modelo de roles: lo que hay, lo que se quiere, y por qué no encaja

Escrito el 20 de agosto de 2026 con lo que Vero fue diciendo:

> *"faqs lo creé en admin pero luego se tiene que ver en la página de todos los
> usuarios"*
> *"cada familia tiene que estar controlada"*
> *"roles admin y luego padre, madre, hijos e igual invitado, que puedes ser
> abuelo"*
> *"se pueden combinar: un admin puede ser un invitado, padre o madre"*

Esa última frase es la importante, y es la que rompe el modelo actual.

---

## Lo que hay hoy, medido

### Tres vocabularios distintos que no se hablan

| Dónde | Qué valores usa |
|---|---|
| La interfaz, al comprobar permisos | solo `"admin"` y `"padre"` |
| `familyService.ts:63`, al crear familia | `"padre" \| "madre" \| "tutor"` |
| `useAuth.ts:42`, al registrarse | siempre `"padre"`, fijo |

Son tres conjuntos que no coinciden. `"madre"` y `"tutor"` se pueden guardar y
**nadie los comprueba nunca**: `Dashboard.tsx:63` hace
`role === "padre" || role === "admin"`, así que **una madre registrada como
`"madre"` no tendría permisos de madre.**

Hoy no explota porque el registro siempre escribe `"padre"`, pase lo que pase.

### El rol es UN solo valor

En Firestore, el documento del usuario tiene `rol: string`. Un valor, uno solo.

**Y eso no puede expresar lo que Vero quiere.** Si un admin puede ser además
madre de su familia, hacen falta dos cosas a la vez, y en un campo de texto
solo cabe una.

### `hijo` e `invitado` no existen

No hay ni una comprobación de esos roles en todo el código. Los hijos hoy no
tienen cuenta: se les da un enlace, `/child-view/:familyId/:childId`, que no
pide sesión.

---

## Por qué no encaja: son DOS cosas distintas

El nudo es que se están mezclando dos preguntas que no tienen nada que ver:

| | Pregunta | Alcance | Ejemplo |
|---|---|---|---|
| **Rol global** | ¿Qué puedes hacer en la aplicación? | toda la app | `admin` mantiene las FAQs |
| **Papel en una familia** | ¿Qué eres en ESTA familia? | una familia | `madre` aquí, `invitada` en la de tu hermana |

`admin` es global: no eres administrador *de una familia*, eres administrador
de las FAQs, que las ven todos.

`madre`, `hijo` e `invitado` son por familia: **la misma persona puede ser madre
en la suya e invitada en otra**. Un abuelo es invitado en las familias de sus
dos hijos.

Metidos en un solo campo, esto es irresoluble. Separados, se cae solo.

### Cómo quedaría

```
usuarios/{uid}
  nombre, email
  esAdmin: boolean          <- global, y por defecto false

familias/{familyId}
  miembros/{uid}
    papel: "madre" | "padre" | "tutor" | "hijo" | "invitado"
```

Con eso:
- Un admin que además es madre: `esAdmin: true` y `papel: "madre"` en su familia.
- Un abuelo: sin `esAdmin`, y `papel: "invitado"` en dos familias.
- Y **la pertenencia a la familia deja de ser un campo suelto y pasa a ser la
  lista de miembros**, que es justo lo que hace falta para el punto siguiente.

---

## Lo que esto desbloquea: la comprobación de propiedad

Hoy `/reward-tracker/:familyId/:childId` coge el `familyId` de la URL y **no
comprueba que sea el tuyo**. Cualquiera con cuenta que cambie el identificador
entra en los puntos de otra familia, y puede marcar tareas y canjear
privilegios.

Con el modelo de arriba, la comprobación es directa: *¿existe
`familias/{id}/miembros/{miUid}`?* Si no existe, fuera.

**Y esa comprobación tiene que estar en el servidor**, no solo en el navegador.
Las reglas de seguridad de Firestore son el sitio, porque los datos salen de
ahí: si la regla no lo impide, da igual lo que haga la interfaz.

---

## Las FAQs: se administran en un sitio y se ven en otro

Vero: *"faqs lo creé en admin pero luego se tiene que ver en la página de todos
los usuarios"*.

**Eso ya está montado, y funciona:**

| Ruta | Quién entra | Estado |
|---|---|---|
| `/faqs` | cualquiera, sin sesión | funciona |
| `/admin/faqs` | solo `admin` | funciona, guarda puesta el 20-ago |

**Lo que falta es exactamente lo mismo que faltaba en la de admin: la puerta.**
No hay ni un enlace a `/faqs` en toda la aplicación. Solo se llega escribiendo
la URL.

Así que no hay que construir nada: hay que **enlazarlo**. Un enlace a `/faqs`
donde lo vea cualquiera, y otro a `/admin/faqs` donde solo lo vea un admin.

---

## Orden sugerido

1. **Los dos enlaces.** Es lo más barato de todo y hace visible lo que ya
   existe. Media hora.
2. **Separar `esAdmin` del papel en la familia.** Es el cambio de modelo, y sin
   él lo demás no se puede hacer bien.
3. **La comprobación de propiedad**, en las reglas de Firestore primero y en la
   interfaz después.
4. **Decidir qué es `invitado`.** ¿Solo mira? ¿Ve a todos los hijos o a uno?
   Eso es producto, no código.
5. **Decidir si los hijos tienen cuenta.** Hoy no la tienen: el enlace de
   `child-view` es un secreto compartido. Si eso está bien pensado, se deja y
   se documenta. Si no, es otro agujero.

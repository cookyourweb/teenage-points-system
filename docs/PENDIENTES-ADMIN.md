# El rol de administrador: qué falta y qué está mal

Apuntado el 20 de agosto de 2026, a raíz de que Vero dijera *"teníamos usuario
admin y ese usuario antes podía editar FAQs, creo, ahora no está esa parte"*.

Se comprobó en el código. **La intuición era correcta, y el problema es mayor
de lo que parecía.**

---

## 1. La administración de FAQs existe, pero no se llega

`FaqAdmin` está enrutada en `App.tsx:82` como `/admin/faqs`. La pantalla
funciona: crea, edita y borra categorías, preguntas y soluciones.

**Pero no hay ni un enlace ni un botón en toda la aplicación que lleve ahí.**
Solo se entra escribiendo la URL a mano.

No es que se quitara: es que nunca se puso la puerta.

**Qué hacer:** añadir la entrada en el sitio donde ya se decide qué ve un
admin, que hoy es `Dashboard.tsx:265`.

---

## 2. GRAVE: cualquier usuario puede editar las FAQs

La ruta es esta:

```tsx
<Route
  path="/admin/faqs"
  element={user ? <FaqAdmin /> : <Navigate to="/" replace />}
/>
```

La condición es **`user`**, no `isAdmin`. Es decir: comprueba que hayas
iniciado sesión, no que seas administrador.

**Cualquiera que tenga cuenta y escriba `/admin/faqs` puede borrar las FAQs de
todo el mundo.** Un hijo incluido.

Y el rol existe: `Dashboard.tsx:62` tiene `const isAdmin = role === "admin"`.
Está calculado y no se usa aquí.

**Qué hacer:** una guarda de ruta que compruebe el rol, no solo la sesión. Y
como la comprobación de cliente se puede saltar, **el backend tiene que
comprobarlo también**: una guarda en el navegador es comodidad, no seguridad.

---

## 3. El rol de admin casi no hace nada

`isAdmin` se usa **una sola vez en todo el proyecto**, en `Dashboard.tsx:265`,
para enseñar el botón de "Invitar Miembro". Nada más.

Vero: *"su función es también editar usuarios, etc."* Eso hoy no existe.

**Qué hacer, cuando toque:** decidir qué puede hacer un admin y que se note.
Como mínimo:

- Gestionar las FAQs (ya está hecho, solo falta la puerta y la guarda)
- Ver y editar los usuarios de la familia: cambiar rol, quitar acceso
- Ver quién ha entrado y cuándo

---

## 3-bis. ~~GRAVE: nadie comprueba de qué familia eres~~ HECHO

**Cerrado el 20-ago en dos capas:**

- `RutaDeMiFamilia` en el navegador, con 6 tests. Compara la familia de la URL
  con la del usuario, deniega por defecto y explica por qué en vez de echar en
  silencio.
- **`firestore.rules`, que es lo que protege de verdad.** Ahora está en el
  repositorio: hasta hoy vivía solo en la consola de Firebase, sin historial ni
  revisión posible.

**PENDIENTE Y OBLIGATORIO:** las reglas no protegen nada hasta que se
despliegan.

```bash
firebase deploy --only firestore:rules
```

Lo que sigue debajo es el diagnóstico original, que explica por qué.

---

Salió al arreglar la guarda de rol, mirando las demás rutas.

```tsx
<Route
  path="/reward-tracker/:familyId/:childId"
  element={user ? <RewardTracker /> : <Navigate to="/" replace />}
/>
```

`RewardTracker` coge `familyId` de la URL con `useParams` y **no comprueba en
ningún momento que esa familia sea la tuya**. Tiene `user` y tiene `role`, pero
no compara el `familyId` de la URL con el de tu usuario.

Es decir: **cualquiera con cuenta que cambie el identificador de la URL entra
en el seguimiento de puntos de OTRA familia.** Y no solo mira: puede marcar
tareas, canjear privilegios y editar.

Esto NO es lo mismo que la guarda de rol y no se arregla igual:

- La de rol pregunta **"¿quién eres?"**. Se resuelve con el rol.
- Esta pregunta **"¿esto es tuyo?"**. Se resuelve comparando la familia de la
  URL con la del usuario, y **sobre todo en el servidor**, porque los datos
  vienen de ahí.

Lo mismo aplica a `/child-view/:familyId/:childId`, aunque ahí es más discutible
porque esa vista está pensada para compartirse por enlace con el hijo.

**Qué hacer:** decidir primero el modelo. ¿El enlace de la vista del hijo es un
secreto compartido a propósito, o hace falta sesión? De esa respuesta sale si
`child-view` se protege igual que `reward-tracker` o no.

---

## 4. `AddFaq.tsx` está huérfano

71 líneas, cero importaciones y sin ruta. Es el tercer fichero muerto que
aparece, después de `ui/Input.tsx` y `ui/taskForm.tsx`.

**Antes de borrarlo**, mirar si hace algo que `FaqAdmin` no haga. Si no, fuera:
un fichero que nadie usa no protege de nada y confunde al que llega.

---

## Orden sugerido

1. ~~**La guarda de rol** (punto 2)~~. **HECHO** el 20-ago: `RutaSoloAdmin`,
   con 6 tests. Deniega por defecto y no decide mientras carga el rol.
   Pendiente: que **el servidor** lo compruebe también. La guarda del navegador
   es comodidad, no seguridad.
1-bis. **La comprobación de propiedad** (punto 3-bis). Es el agujero que queda,
   y es más gordo que el anterior porque afecta a los datos de otras familias.
2. **La puerta** (punto 1). Es media hora y desbloquea una pantalla que ya
   funciona.
3. Decidir el alcance del admin (punto 3). Eso es producto, no código.
4. Borrar `AddFaq` si sobra (punto 4).

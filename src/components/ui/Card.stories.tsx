import type { Meta, StoryObj } from "@storybook/react-vite";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrophy, faUsers } from "@fortawesome/free-solid-svg-icons";
import { Card, CardHeader, CardTitle, CardContent } from "./Card";

const meta = {
  title: "UI/Card",
  component: Card,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "La tarjeta. Era la ultima pieza de `ui/` con la puerta abierta: aceptaba `className` libre y por ahi se le " +
          "colaba un degradado entero. De 49 usos con `className`, 26 eran `flex items-center gap-2` para poner un " +
          "icono en el titulo, 12 eran `text-center` y 14 eran aire para estados vacios. Solo 5 eran color. " +
          "Asi que la API abre una puerta para cada uso legitimo y cierra la del color.",
      },
    },
  },
  args: { children: "Contenido" },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Lo normal: cabecera con titulo y contenido debajo. */
export const Basica: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Puntos de la familia</CardTitle>
      </CardHeader>
      <CardContent>Esta semana habéis sumado 340 puntos entre todos.</CardContent>
    </Card>
  ),
};

/**
 * El icono va en una PROP, no en un `className`.
 *
 * Era el uso mas repetido con diferencia: 26 de los 49 usos pasaban
 * `flex items-center gap-2` solo para poner un icono al lado del texto.
 *
 * Y de paso el componente lo marca como decorativo. Si el icono aportara
 * texto, el encabezado se llamaria "🏆 Puntos" y eso es lo que leeria un
 * lector de pantalla.
 */
export const ConIconoEnElTitulo: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle icon={<FontAwesomeIcon icon={faTrophy} />}>Próximo objetivo</CardTitle>
      </CardHeader>
      <CardContent>Te faltan 60 puntos para una hora extra de consola.</CardContent>
    </Card>
  ),
};

/**
 * Los tres tonos. Cada uno es un PAPEL, no un color.
 *
 * `featured` es la que corona una pantalla: va de la marca a la recompensa,
 * que es el viaje que cuenta el producto, esfuerzo a premio. Los dos extremos
 * del degradado estan medidos en la tabla de contraste, porque el texto va
 * encima de todo el recorrido y el peor caso esta en los bordes.
 */
export const Tonos: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent>default, sobre la superficie</CardContent>
      </Card>
      <Card tone="featured">
        <CardContent align="center" padding="lg">
          <p className="text-4xl font-bold">340</p>
          <p>puntos esta semana</p>
        </CardContent>
      </Card>
      <Card tone="reward">
        <CardContent>reward, para privilegios y premios</CardContent>
      </Card>
    </div>
  ),
};

/**
 * El estado vacio: centrado y con aire.
 *
 * Antes se escribia `text-center py-12` a mano en cada uno. Ahora son dos
 * props, y todos los estados vacios de la aplicacion respiran igual.
 */
export const EstadoVacio: Story = {
  render: () => (
    <Card>
      <CardContent align="center" padding="lg">
        <FontAwesomeIcon icon={faUsers} className="mb-3 text-2xl text-content-muted" />
        <p className="text-content-muted">Todavía no has añadido a ningún hijo.</p>
      </CardContent>
    </Card>
  ),
};

/**
 * `interactive` SOLO cuando dentro hay algo que hacer.
 *
 * Ahi el realce al pasar el raton es informacion: "esto responde". Una tarjeta
 * que se mueve y no hace nada promete algo que no cumple, y eso desgasta la
 * confianza en toda la interfaz.
 */
export const Interactiva: Story = {
  render: () => (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card interactive>
        <CardContent>
          <p className="font-medium text-content">Lucía</p>
          <p className="text-content-muted">120 puntos</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <p className="font-medium text-content">Sin acciones dentro</p>
          <p className="text-content-muted">Esta no se realza, y hace bien</p>
        </CardContent>
      </Card>
    </div>
  ),
};

/**
 * LA PUERTA CERRADA.
 *
 * Esto ya no compila:
 *
 *     <Card className="bg-gradient-to-r from-primary-500 to-accent-600">
 *
 * Y era codigo real: estaba en `ChildView.tsx:191`. Ahora es `tone="featured"`,
 * que ademas se puede cambiar en un sitio para toda la aplicacion.
 *
 * La leccion del cambio: **cerrar sin dar alternativa es lo que hace que la
 * gente se salte el sistema**. Por eso primero se midio que se pasaba de
 * verdad, y cada uso legitimo tiene ahora su prop.
 */
export const AntesYDespues: Story = {
  render: () => (
    <Card tone="featured">
      <CardContent align="center" padding="lg">
        <p className="text-4xl font-bold">340</p>
        <p>puntos esta semana</p>
      </CardContent>
    </Card>
  ),
};

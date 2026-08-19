import type { Preview } from '@storybook/react-vite'

// Sin esto, las stories se pintan sin Tailwind: la app carga globals.css
// desde src/main.tsx, y Storybook no pasa por ese fichero.
import '../src/globals.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    // El auditor de accesibilidad FALLA la story en vez de avisar en un panel
    // que nadie abre. Con 'todo' se queda en aviso; con 'error' se entera
    // quien la rompe, en el momento de romperla.
    //
    // Ojo con lo que esto NO cubre: axe comprueba lo mecanico (que exista una
    // etiqueta, que el contraste de el numero, que no haya ids repetidos). No
    // sabe si la etiqueta dice algo util, ni si el orden del foco tiene
    // sentido, ni si un mensaje de error ayuda a arreglar nada. Cero
    // violaciones no significa accesible.
    a11y: { test: 'error' },
  },
};

export default preview;
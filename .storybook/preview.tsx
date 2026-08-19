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
  },
};

export default preview;
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { db } from '../firebase';

/**
 * A qué familia perteneces.
 *
 * Existe porque cada pantalla lo leía de Firestore por su cuenta: `Dashboard`
 * tiene su propio `fetchFamilyId`, y lo mismo en otros sitios. Es el cuarto
 * caso del mismo patrón en este proyecto, después de `ui/Input`,
 * `ui/taskForm` y el cálculo de la semana: **lógica que ya existía pero no se
 * podía reutilizar, así que todo el mundo la reescribía**.
 *
 * Aquí importa además por otro motivo: es el dato con el que se decide si
 * puedes ver los puntos de una familia. Si cada pantalla lo lee a su manera,
 * cada pantalla puede equivocarse a su manera.
 */
export function useMiFamilia(uid: string | undefined) {
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setFamilyId(null);
      setIsLoading(false);
      return;
    }

    let vigente = true;
    setIsLoading(true);

    getDoc(doc(db, 'usuarios', uid))
      .then((documento) => {
        if (!vigente) return;
        const valor = documento.exists() ? documento.data().familyId : null;
        // Solo vale una cadena con contenido. Un campo vacío o de otro tipo se
        // trata como "no tiene familia", no como comodín.
        setFamilyId(typeof valor === 'string' && valor.trim() !== '' ? valor : null);
      })
      .catch((error) => {
        console.error('No se pudo leer la familia del usuario:', error);
        // Si falla la lectura NO se asume nada: sin familia. Un error al
        // comprobar permisos no puede acabar en permiso concedido.
        if (vigente) setFamilyId(null);
      })
      .finally(() => {
        if (vigente) setIsLoading(false);
      });

    // Evita que una respuesta lenta de un uid anterior pise a la del actual.
    return () => {
      vigente = false;
    };
  }, [uid]);

  return { familyId, isLoading };
}

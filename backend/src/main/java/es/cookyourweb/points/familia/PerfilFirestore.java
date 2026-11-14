package es.cookyourweb.points.familia;

import java.util.Optional;

/**
 * Puerto: de que familia dice Firestore que eres. Se lee con el token de la
 * PROPIA persona, asi las reglas de Firestore (que solo dejan leer tu
 * documento) son las que deciden, y el familyId devuelto es fiable.
 */
public interface PerfilFirestore {

    /**
     * @return el familyId, o vacio si el documento no existe (404), no se puede
     *         leer (403) o no trae familyId.
     * @throws ServicioExternoException ante cualquier otro fallo (red, timeout, 5xx).
     */
    Optional<String> familyIdDe(String uid, String tokenDeLaPersona);
}

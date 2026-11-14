package es.cookyourweb.points.familia;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;
import java.util.Optional;

/**
 * Lee usuarios/{uid} con la API REST de Firestore (sin Admin SDK) reenviando el
 * token de la propia persona: las reglas desplegadas solo le dejan leer SU
 * documento, y no dejan crearlo con un familyId ajeno ni cambiarlo despues. Por
 * eso lo que devuelve Firestore es fiable y lo que manda el navegador no.
 */
@Component
public class PerfilFirestoreRest implements PerfilFirestore {

    private final RestClient cliente;
    private final String proyecto;

    public PerfilFirestoreRest(RestClient.Builder builder,
                               @Value("${app.firestore.url-base}") String urlBase,
                               @Value("${app.firebase.project-id}") String proyecto) {
        this.cliente = builder.baseUrl(urlBase).build();
        this.proyecto = proyecto;
    }

    @Override
    public Optional<String> familyIdDe(String uid, String tokenDeLaPersona) {
        try {
            // Plantilla con variables: el uid se escapa como un solo segmento de ruta
            // (un "/" en el uid no abre otra ruta) y los parentesis de "(default)" son literales.
            return cliente.get()
                    .uri("/projects/{proyecto}/databases/(default)/documents/usuarios/{uid}", proyecto, uid)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenDeLaPersona)
                    .exchange((peticion, respuesta) -> {
                        HttpStatus estado = HttpStatus.resolve(respuesta.getStatusCode().value());
                        // 404 (no hay documento) y 403 (las reglas no te dejan) significan lo mismo: no hay familia para ti.
                        if (estado == HttpStatus.NOT_FOUND || estado == HttpStatus.FORBIDDEN) {
                            return Optional.<String>empty();
                        }
                        if (!respuesta.getStatusCode().is2xxSuccessful()) {
                            throw new ServicioExternoException(
                                    "Firestore respondio " + respuesta.getStatusCode().value(), null);
                        }
                        return extraerFamilyId(respuesta.bodyTo(Map.class));
                    });
        } catch (RestClientException e) {
            // Red caida, timeout o cuerpo ilegible: NO es "no eres de la familia".
            throw new ServicioExternoException("No se pudo leer el perfil en Firestore", e);
        }
    }

    // Formato de Firestore: {"fields":{"familyId":{"stringValue":"..."}}}
    private static Optional<String> extraerFamilyId(Map<?, ?> documento) {
        if (documento == null || !(documento.get("fields") instanceof Map<?, ?> campos)) {
            return Optional.empty();
        }
        if (!(campos.get("familyId") instanceof Map<?, ?> campo)) {
            return Optional.empty();
        }
        return campo.get("stringValue") instanceof String valor ? Optional.of(valor) : Optional.empty();
    }
}

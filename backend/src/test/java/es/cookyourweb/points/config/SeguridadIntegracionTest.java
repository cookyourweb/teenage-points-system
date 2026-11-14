package es.cookyourweb.points.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandlers;
import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * La cadena de seguridad completa sobre un servidor real (puerto aleatorio).
 *
 * MockMvc NO sirve para lo importante de aqui: no redespacha a /error. En un servidor
 * real, cuando un controlador falla (JSON mal formado, ruta inexistente, metodo no
 * permitido) el contenedor vuelve a despachar la peticion a /error, y Spring Security
 * filtra TAMBIEN ese segundo despacho. Sin permitirlo, caia en denyAll y el cliente
 * veia 403 con cuerpo vacio en lugar del 400/404/405 verdadero.
 *
 * Ningun caso toca Mongo: el backend arranca aunque no este.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"app.firebase.project-id=proyecto-test",
                // Sin Mongo, el health espera 30 s a un servidor que no llega; 500 ms basta.
                "spring.mongodb.uri=mongodb://localhost:27017/points?serverSelectionTimeoutMS=500"})
class SeguridadIntegracionTest {

    private static final String TOKEN_VALIDO = "token-valido";
    private static final String TOKEN_INVALIDO = "token-invalido";

    @LocalServerPort
    private int puerto;

    // La firma real se prueba en TokenFirebaseTest; aqui un doble evita descargar el JWKS.
    @MockitoBean
    private JwtDecoder jwtDecoder;

    private final HttpClient cliente = HttpClient.newHttpClient();

    @BeforeEach
    void preparaDecodificador() {
        Instant ahora = Instant.now();
        Jwt jwt = Jwt.withTokenValue(TOKEN_VALIDO)
                .header("alg", "RS256")
                .subject("uid-1")
                .issuedAt(ahora)
                .expiresAt(ahora.plusSeconds(600))
                .claims(c -> c.putAll(Map.of("aud", "proyecto-test")))
                .build();
        when(jwtDecoder.decode(eq(TOKEN_VALIDO))).thenReturn(jwt);
        when(jwtDecoder.decode(eq(TOKEN_INVALIDO))).thenThrow(new BadJwtException("firma invalida"));
    }

    private HttpResponse<String> envia(String metodo, String ruta, String token, String cuerpo) throws Exception {
        HttpRequest.Builder peticion = HttpRequest.newBuilder(URI.create("http://localhost:" + puerto + ruta))
                .method(metodo, cuerpo == null ? BodyPublishers.noBody() : BodyPublishers.ofString(cuerpo));
        if (token != null) {
            peticion.header("Authorization", "Bearer " + token);
        }
        if (cuerpo != null) {
            peticion.header("Content-Type", "application/json");
        }
        return cliente.send(peticion.build(), BodyHandlers.ofString());
    }

    @Test
    @DisplayName("con sesion valida, un JSON mal formado da 400 y no 403")
    void jsonMalFormadoDa400() throws Exception {
        assertThat(envia("POST", "/api/tasks", TOKEN_VALIDO, "{esto no es json").statusCode()).isEqualTo(400);
    }

    @Test
    @DisplayName("con sesion valida, una ruta de la API que no existe da 404 y no 403")
    void rutaInexistenteDa404() throws Exception {
        assertThat(envia("GET", "/api/noexiste", TOKEN_VALIDO, null).statusCode()).isEqualTo(404);
    }

    @Test
    @DisplayName("con sesion valida, un metodo no permitido da 405 y no 403")
    void metodoNoPermitidoDa405() throws Exception {
        assertThat(envia("DELETE", "/api/me", TOKEN_VALIDO, null).statusCode()).isEqualTo(405);
    }

    @Test
    @DisplayName("un Bearer invalido da 401")
    void bearerInvalidoDa401() throws Exception {
        assertThat(envia("GET", "/api/me", TOKEN_INVALIDO, null).statusCode()).isEqualTo(401);
    }

    @Test
    @DisplayName("/actuator/health sin token no se rechaza por autenticacion")
    void healthSinTokenEstaAbierto() throws Exception {
        // 200 o 503 segun haya Mongo; lo que no puede ser es 401 ni 403.
        assertThat(envia("GET", "/actuator/health", null, null).statusCode()).isNotIn(401, 403);
    }

    @Test
    @DisplayName("una ruta fuera de /api sin error previo sigue cerrada con 403")
    void rutaFueraDeApiCerrada() throws Exception {
        assertThat(envia("GET", "/otra", TOKEN_VALIDO, null).statusCode()).isEqualTo(403);
    }
}

package es.cookyourweb.points.familia;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.net.InetSocketAddress;
import java.time.Duration;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/** El adaptador contra un Firestore falso: nunca se llama al real desde los tests. */
class PerfilFirestoreRestTest {

    private static final String BASE = "https://firestore.test/v1";
    private static final String RUTA_ANA =
            BASE + "/projects/proyecto-test/databases/(default)/documents/usuarios/ana";

    private MockRestServiceServer servidor;
    private PerfilFirestoreRest perfil;

    @BeforeEach
    void preparar() {
        RestClient.Builder builder = RestClient.builder();
        servidor = MockRestServiceServer.bindTo(builder).build();
        perfil = new PerfilFirestoreRest(builder, BASE, "proyecto-test");
    }

    @Test
    void leeElFamilyIdConElTokenDeLaPersona() {
        servidor.expect(requestTo(RUTA_ANA))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer tok-ana"))
                .andRespond(withSuccess("{\"fields\":{\"familyId\":{\"stringValue\":\"f1\"}}}",
                        MediaType.APPLICATION_JSON));

        assertThat(perfil.familyIdDe("ana", "tok-ana")).isEqualTo(Optional.of("f1"));
        servidor.verify();
    }

    @Test
    void documentoInexistenteEsVacio() {
        servidor.expect(requestTo(RUTA_ANA)).andRespond(withStatus(HttpStatus.NOT_FOUND));

        assertThat(perfil.familyIdDe("ana", "tok-ana")).isEmpty();
    }

    @Test
    void sinPermisoEsVacio() {
        servidor.expect(requestTo(RUTA_ANA)).andRespond(withStatus(HttpStatus.FORBIDDEN));

        assertThat(perfil.familyIdDe("ana", "tok-ana")).isEmpty();
    }

    @Test
    void sinCampoFamilyIdEsVacio() {
        servidor.expect(requestTo(RUTA_ANA))
                .andRespond(withSuccess("{\"fields\":{\"nombre\":{\"stringValue\":\"Ana\"}}}",
                        MediaType.APPLICATION_JSON));

        assertThat(perfil.familyIdDe("ana", "tok-ana")).isEmpty();
    }

    @Test
    void errorDelServidorLanzaServicioExterno() {
        servidor.expect(requestTo(RUTA_ANA)).andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        assertThatThrownBy(() -> perfil.familyIdDe("ana", "tok-ana"))
                .isInstanceOf(ServicioExternoException.class);
    }

    @Test
    void elUidSeEscapaEnLaRuta() {
        // Un uid con "/" no puede abrir otra ruta de la API de Firestore.
        servidor.expect(requestTo(BASE
                        + "/projects/proyecto-test/databases/(default)/documents/usuarios/a%2Fb"))
                .andRespond(withStatus(HttpStatus.NOT_FOUND));

        assertThat(perfil.familyIdDe("a/b", "tok")).isEmpty();
        servidor.verify();
    }

    @Test
    void siFirestoreNoRespondeATiempoLanzaServicioExterno() throws Exception {
        // Servidor real del JDK que acepta y no contesta: el timeout de ClienteHttp debe cortar.
        HttpServer colgado = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        colgado.createContext("/", ex -> {
            try {
                Thread.sleep(3000);
            } catch (InterruptedException ignorada) {
                Thread.currentThread().interrupt();
            }
            ex.close();
        });
        colgado.start();
        try {
            RestClient.Builder builder = ClienteHttp.builderConTimeouts(Duration.ofMillis(300));
            PerfilFirestoreRest real = new PerfilFirestoreRest(builder,
                    "http://127.0.0.1:" + colgado.getAddress().getPort(), "proyecto-test");

            assertThatThrownBy(() -> real.familyIdDe("ana", "tok-ana"))
                    .isInstanceOf(ServicioExternoException.class);
        } finally {
            colgado.stop(0);
        }
    }
}

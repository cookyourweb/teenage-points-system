package es.cookyourweb.points.ia;

import es.cookyourweb.points.familia.EstadoMembresia;
import es.cookyourweb.points.familia.Membresia;
import es.cookyourweb.points.familia.MembresiaRepository;
import es.cookyourweb.points.familia.Papel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mongodb.MongoDBContainer;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandlers;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * La demo de seguridad de la eleccion de colores, con Mongo real y el JWT por la cadena de
 * seguridad: una cuenta de otra familia recibe 404 al escribir y al leer, y no deja rastro.
 */
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"app.firebase.project-id=proyecto-test", "logging.level.org.mongodb.driver=ERROR"})
class EleccionTipoIntegracionTest {

    private static final String FAMILIA = "fA";
    private static final String RUTA = "/api/familias/" + FAMILIA + "/hijos/h1/tipo";

    @Container
    @ServiceConnection
    static MongoDBContainer mongo = new MongoDBContainer("mongo:7");

    @LocalServerPort
    private int puerto;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Autowired
    private MembresiaRepository membresias;

    @Autowired
    private EleccionTipoRepository elecciones;

    @Autowired
    private MongoTemplate mongoTemplate;

    private final HttpClient cliente = HttpClient.newHttpClient();

    @BeforeEach
    void preparaEscenario() {
        await().atMost(Duration.ofSeconds(20)).untilAsserted(() ->
                assertThat(mongoTemplate.indexOps(EleccionTipo.class).getIndexInfo())
                        .anyMatch(i -> i.isUnique() && i.getName().equals("familyId_1_hijoId_1_uid_1")));

        mongoTemplate.getCollectionNames().forEach(c -> mongoTemplate.remove(new Query(), c));

        when(jwtDecoder.decode(anyString())).thenThrow(new BadJwtException("token desconocido"));
        for (String uid : new String[]{"ana", "beto", "intruso"}) {
            Instant ahora = Instant.now();
            Jwt jwt = Jwt.withTokenValue("token-" + uid)
                    .header("alg", "RS256")
                    .subject(uid)
                    .issuedAt(ahora)
                    .expiresAt(ahora.plusSeconds(600))
                    .claims(c -> c.putAll(Map.of("aud", "proyecto-test")))
                    .build();
            when(jwtDecoder.decode(eq("token-" + uid))).thenReturn(jwt);
        }
        for (String uid : new String[]{"ana", "beto"}) {
            membresias.save(new Membresia(null, uid, FAMILIA, Papel.ADULTO, EstadoMembresia.ACTIVA, Instant.now()));
        }
    }

    private HttpResponse<String> envia(String metodo, String uid, String cuerpo) throws Exception {
        HttpRequest.Builder peticion = HttpRequest.newBuilder(URI.create("http://localhost:" + puerto + RUTA))
                .header("Authorization", "Bearer token-" + uid)
                .method(metodo, cuerpo == null ? BodyPublishers.noBody() : BodyPublishers.ofString(cuerpo));
        if (cuerpo != null) {
            peticion.header("Content-Type", "application/json");
        }
        return cliente.send(peticion.build(), BodyHandlers.ofString());
    }

    @Test
    @DisplayName("una cuenta de otra familia recibe 404 al escribir y al leer, y no se guarda nada")
    void otraFamiliaDa404() throws Exception {
        assertThat(envia("PUT", "intruso", "{\"colores\":[\"rojo\"]}").statusCode()).isEqualTo(404);
        assertThat(envia("GET", "intruso", null).statusCode()).isEqualTo(404);
        // Ni siquiera un cuerpo invalido le cambia el 404 por un 400.
        assertThat(envia("PUT", "intruso", "{\"colores\":[]}").statusCode()).isEqualTo(404);
        assertThat(elecciones.count()).isZero();

        // Lo que Ana guarda tampoco es visible para el intruso
        assertThat(envia("PUT", "ana", "{\"colores\":[\"rojo\"]}").statusCode()).isEqualTo(200);
        assertThat(envia("GET", "intruso", null).statusCode()).isEqualTo(404);
    }

    @Test
    @DisplayName("dos PUT del mismo adulto dejan una sola eleccion en Mongo, y el uid del cuerpo se ignora")
    void sustituyeNoDuplica() throws Exception {
        assertThat(envia("PUT", "ana", "{\"colores\":[\"amarillo\",\"rojo\"],\"principal\":\"rojo\"}").statusCode())
                .isEqualTo(200);
        HttpResponse<String> segunda = envia("PUT", "ana",
                "{\"uid\":\"beto\",\"colores\":[\"azul\"],\"principal\":null}");
        assertThat(segunda.statusCode()).isEqualTo(200);
        assertThat(segunda.body()).contains("\"colores\":[\"azul\"]").doesNotContain("principal");

        List<EleccionTipo> guardadas = elecciones.findAll();
        assertThat(guardadas).hasSize(1);
        assertThat(guardadas.get(0).uid()).isEqualTo("ana");
        assertThat(guardadas.get(0).colores()).containsExactly("azul");
    }

    @Test
    @DisplayName("cada adulto ve las dos elecciones, con esMia solo en la suya, y coinciden segun difieran")
    void cadaAdultoGuardaLaSuya() throws Exception {
        envia("PUT", "ana", "{\"colores\":[\"rojo\",\"amarillo\"],\"principal\":\"rojo\"}");
        envia("PUT", "beto", "{\"colores\":[\"amarillo\",\"rojo\"],\"principal\":\"rojo\"}");

        HttpResponse<String> deAna = envia("GET", "ana", null);
        assertThat(deAna.statusCode()).isEqualTo(200);
        assertThat(deAna.body()).contains("\"coinciden\":true");
        assertThat(deAna.body().split("\"esMia\":true", -1)).hasSize(2);
        assertThat(deAna.body().split("\"esMia\":false", -1)).hasSize(2);

        envia("PUT", "beto", "{\"colores\":[\"rojo\",\"amarillo\"]}");
        assertThat(envia("GET", "ana", null).body()).contains("\"coinciden\":false");
    }

    @Test
    @DisplayName("el indice unico (familyId, hijoId, uid) rechaza un duplicado")
    void duplicadoRechazado() {
        elecciones.save(new EleccionTipo(null, FAMILIA, "h1", "ana", List.of("rojo"), null, Instant.now()));
        assertThatThrownBy(() ->
                elecciones.save(new EleccionTipo(null, FAMILIA, "h1", "ana", List.of("azul"), null, Instant.now())))
                .isInstanceOf(DuplicateKeyException.class);
    }

    @Test
    @DisplayName("una eleccion invalida de un miembro da 400 con campos")
    void invalidaDa400() throws Exception {
        HttpResponse<String> r = envia("PUT", "ana", "{\"colores\":[\"rojo\"],\"principal\":\"azul\"}");
        assertThat(r.statusCode()).isEqualTo(400);
        assertThat(r.body()).contains("\"campos\":{\"principal\":\"tiene que estar entre los colores marcados\"}");
        assertThat(elecciones.count()).isZero();
    }
}

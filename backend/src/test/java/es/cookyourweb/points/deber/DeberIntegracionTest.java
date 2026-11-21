package es.cookyourweb.points.deber;

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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Los deberes son datos escolares de un menor: una segunda familia no los ve ni los toca, ni por
 * la ruta de su propia familia. De integracion a proposito: con Mongo real y el JWT por la cadena
 * de seguridad, y el indice unico (familyId, hijoId, clave) creado por IndicesMongo, no por un mock.
 * Datos ficticios: ana es de fA y fC, bea de fB; el hijo es leo.
 */
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"app.firebase.project-id=proyecto-test",
                "logging.level.org.mongodb.driver=ERROR"})
class DeberIntegracionTest {

    private static final String ENLACE_1 = "https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO2/details";
    private static final String BASE_A = "/api/familias/fA/hijos/leo";

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
    private MongoTemplate mongoTemplate;

    private final HttpClient cliente = HttpClient.newHttpClient();
    private String d1;

    @BeforeEach
    void preparaEscenario() throws Exception {
        await().atMost(Duration.ofSeconds(20)).untilAsserted(() ->
                assertThat(mongoTemplate.indexOps(Deber.class).getIndexInfo())
                        .anyMatch(i -> i.isUnique() && i.getName().equals("familyId_1_hijoId_1_clave_1")));

        mongoTemplate.getCollectionNames().forEach(c -> mongoTemplate.remove(new Query(), c));

        when(jwtDecoder.decode(anyString())).thenThrow(new BadJwtException("token desconocido"));
        for (String uid : new String[]{"ana", "bea"}) {
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
        for (String[] m : new String[][]{{"ana", "fA"}, {"ana", "fC"}, {"bea", "fB"}}) {
            membresias.save(new Membresia(null, m[0], m[1], Papel.ADULTO, EstadoMembresia.ACTIVA, Instant.now()));
        }

        HttpResponse<String> creado = envia("POST", BASE_A + "/deberes", "ana", cuerpo("Mates original", ENLACE_1));
        assertThat(creado.statusCode()).isEqualTo(201);
        Matcher m = Pattern.compile("\"id\"\\s*:\\s*\"([^\"]+)\"").matcher(creado.body());
        assertThat(m.find()).isTrue();
        d1 = m.group(1);
    }

    private HttpResponse<String> envia(String metodo, String ruta, String uid, String cuerpo) throws Exception {
        HttpRequest.Builder peticion = HttpRequest.newBuilder(URI.create("http://localhost:" + puerto + ruta))
                .header("Authorization", "Bearer token-" + uid)
                .method(metodo, cuerpo == null ? BodyPublishers.noBody() : BodyPublishers.ofString(cuerpo));
        if (cuerpo != null) {
            peticion.header("Content-Type", "application/json");
        }
        return cliente.send(peticion.build(), BodyHandlers.ofString());
    }

    private static String cuerpo(String titulo, String enlace) {
        return "{\"tipo\":\"ENTREGA\",\"asignatura\":\"Mates\",\"fecha\":\"2027-03-10\",\"titulo\":\"" + titulo
                + "\",\"enlace\":\"" + enlace + "\",\"estado\":\"PENDIENTE\",\"imprimir\":false,\"isActive\":true}";
    }

    private Deber guardado() {
        Deber d = mongoTemplate.findById(d1, Deber.class);
        assertThat(d).isNotNull();
        return d;
    }

    @Test
    @DisplayName("una segunda familia recibe 404 en las cinco rutas y el deber no cambia")
    void otraFamiliaDa404EnTodasLasRutas() throws Exception {
        Deber antes = guardado();

        assertThat(envia("GET", BASE_A + "/deberes", "bea", null).statusCode()).isEqualTo(404);
        assertThat(envia("POST", BASE_A + "/deberes", "bea",
                cuerpo("Intrusa", "https://classroom.google.com/c/EJEMPLO9/a/EJEMPLO9/details")).statusCode())
                .isEqualTo(404);
        assertThat(envia("PUT", BASE_A + "/deberes/" + d1, "bea", cuerpo("Hackeado", ENLACE_1)).statusCode())
                .isEqualTo(404);
        assertThat(envia("PUT", BASE_A + "/importaciones-deberes", "bea", null).statusCode()).isEqualTo(404);
        assertThat(envia("GET", BASE_A + "/importaciones-deberes", "bea", null).statusCode()).isEqualTo(404);

        assertThat(guardado()).isEqualTo(antes);
        assertThat(mongoTemplate.findAll(Deber.class)).hasSize(1);
        assertThat(mongoTemplate.findAll(Importacion.class)).isEmpty();
    }

    @Test
    @DisplayName("ser miembro de otra familia no basta: editar el deber de fA por la ruta de fC da 404")
    void editarConRutaDeOtraFamiliaDa404() throws Exception {
        Deber antes = guardado();

        assertThat(envia("PUT", "/api/familias/fC/hijos/leo/deberes/" + d1, "ana", cuerpo("Hackeado", ENLACE_1))
                .statusCode()).isEqualTo(404);

        assertThat(guardado()).isEqualTo(antes);
    }

    @Test
    @DisplayName("el deber de un hijo no se edita por la ruta de otro hijo de la misma familia")
    void otroHijoDa404() throws Exception {
        Deber antes = guardado();

        assertThat(envia("PUT", "/api/familias/fA/hijos/mia/deberes/" + d1, "ana", cuerpo("Hackeado", ENLACE_1))
                .statusCode()).isEqualTo(404);

        assertThat(guardado()).isEqualTo(antes);
    }

    @Test
    @DisplayName("el mismo enlace dos veces da 409 por el indice unico real y queda un solo documento")
    void mismaClaveDosVecesDa409() throws Exception {
        assertThat(envia("POST", BASE_A + "/deberes", "ana", cuerpo("Repetido", ENLACE_1)).statusCode())
                .isEqualTo(409);

        List<Deber> todos = mongoTemplate.findAll(Deber.class);
        assertThat(todos).hasSize(1);
        assertThat(todos.get(0).titulo()).isEqualTo("Mates original");
    }

    @Test
    @DisplayName("dos importaciones del mismo hijo dejan un solo documento y GET trae la fecha")
    void unaImportacionPorHijo() throws Exception {
        assertThat(envia("PUT", BASE_A + "/importaciones-deberes", "ana", null).statusCode()).isEqualTo(200);
        assertThat(envia("PUT", BASE_A + "/importaciones-deberes", "ana", null).statusCode()).isEqualTo(200);

        assertThat(mongoTemplate.findAll(Importacion.class)).hasSize(1);
        HttpResponse<String> ultima = envia("GET", BASE_A + "/importaciones-deberes", "ana", null);
        assertThat(ultima.statusCode()).isEqualTo(200);
        assertThat(ultima.body()).contains("\"en\"");
    }
}

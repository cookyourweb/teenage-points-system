package es.cookyourweb.points.task;

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
import java.time.Instant;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * La demo de la sesion 3: una segunda cuenta no ve ni toca las tareas de la primera.
 *
 * Es de integracion a proposito. Los tests unitarios con dobles prueban que cada capa llama
 * a requireMember, pero no que la ruta real, con Mongo real y el JWT por la cadena de
 * seguridad, deje fuera a quien no es de la familia. Aqui se recorren las cinco rutas de
 * task/ con una cuenta ajena. Mongo es un contenedor propio con puerto aleatorio: no toca
 * el Mongo local de desarrollo.
 */
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "app.firebase.project-id=proyecto-test")
class PropiedadIntegracionTest {

    private static final String FAMILIA = "fA";
    private static final Pattern TITULO = Pattern.compile("\"title\"\\s*:\\s*\"([^\"]*)\"");

    @Container
    @ServiceConnection
    static MongoDBContainer mongo = new MongoDBContainer("mongo:7");

    @LocalServerPort
    private int puerto;

    // La firma real se prueba en TokenFirebaseTest; aqui el Bearer ES el uid ("token-ana" -> ana).
    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Autowired
    private MembresiaRepository membresias;

    @Autowired
    private MongoTemplate mongoTemplate;

    private final HttpClient cliente = HttpClient.newHttpClient();

    @BeforeEach
    void preparaEscenario() {
        // Cada test parte de cero: las colecciones se vacian, los indices se conservan.
        mongoTemplate.getCollectionNames().forEach(c -> mongoTemplate.remove(new Query(), c));

        when(jwtDecoder.decode(anyString())).thenThrow(new BadJwtException("token desconocido"));
        for (String uid : new String[]{"ana", "beto"}) {
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

    private static String cuerpoTarea(String nombre) {
        return "{\"nombre\":\"" + nombre + "\",\"tipo\":\"DIARIAS\",\"puntos\":5,"
                + "\"familyId\":\"" + FAMILIA + "\",\"isActive\":true}";
    }

    private static String titulo(HttpResponse<String> respuesta) {
        Matcher m = TITULO.matcher(respuesta.body());
        assertThat(m.find()).as("el cuerpo del error trae un title: %s", respuesta.body()).isTrue();
        return m.group(1);
    }

    private static String idDe(HttpResponse<String> respuesta) {
        Matcher m = Pattern.compile("\"id\"\\s*:\\s*\"([^\"]+)\"").matcher(respuesta.body());
        assertThat(m.find()).as("la respuesta trae un id: %s", respuesta.body()).isTrue();
        return m.group(1);
    }

    @Test
    @DisplayName("una segunda cuenta no ve ni toca nada de la familia de la primera, por las cinco rutas")
    void segundaCuentaNoVeNiTocaNada() throws Exception {
        membresias.save(new Membresia(null, "ana", FAMILIA, Papel.ADULTO, EstadoMembresia.ACTIVA, Instant.now()));
        HttpResponse<String> creada = envia("POST", "/api/tasks", "ana", cuerpoTarea("Hacer la cama"));
        assertThat(creada.statusCode()).isEqualTo(201);
        String id = idDe(creada);

        // 1. Listar la familia ajena
        assertThat(envia("GET", "/api/tasks?familyId=" + FAMILIA, "beto", null).statusCode()).isEqualTo(404);

        // 2. Leer por id: 404, y indistinguible de un id que no existe (no se puede sondear que ids hay)
        HttpResponse<String> ajena = envia("GET", "/api/tasks/" + id, "beto", null);
        HttpResponse<String> inexistente = envia("GET", "/api/tasks/no-existe", "beto", null);
        assertThat(ajena.statusCode()).isEqualTo(404);
        assertThat(inexistente.statusCode()).isEqualTo(404);
        assertThat(titulo(ajena)).isEqualTo(titulo(inexistente));

        // 3. Editar: 404 y la tarea sigue igual
        assertThat(envia("PUT", "/api/tasks/" + id, "beto", cuerpoTarea("Hackeada")).statusCode()).isEqualTo(404);
        HttpResponse<String> trasPut = envia("GET", "/api/tasks/" + id, "ana", null);
        assertThat(trasPut.statusCode()).isEqualTo(200);
        assertThat(trasPut.body()).contains("Hacer la cama").doesNotContain("Hackeada");

        // 4. Borrar: 404 y la tarea sigue existiendo
        assertThat(envia("DELETE", "/api/tasks/" + id, "beto", null).statusCode()).isEqualTo(404);
        assertThat(envia("GET", "/api/tasks/" + id, "ana", null).statusCode()).isEqualTo(200);

        // 5. Crear en la familia ajena: 404 y no se guarda nada
        assertThat(envia("POST", "/api/tasks", "beto", cuerpoTarea("Intrusa")).statusCode()).isEqualTo(404);

        // Ana, en cambio, ve exactamente su tarea, firmada con su uid
        HttpResponse<String> lista = envia("GET", "/api/tasks?familyId=" + FAMILIA, "ana", null);
        assertThat(lista.statusCode()).isEqualTo(200);
        assertThat(lista.body()).contains("\"createdBy\":\"ana\"").contains("Hacer la cama").doesNotContain("Intrusa");
        assertThat(lista.body().split("\"id\"", -1)).as("una sola tarea en la lista").hasSize(2);
    }

    @Test
    @DisplayName("el indice unico (uid, familyId) rechaza una membresia duplicada")
    void membresiaDuplicadaRechazada() {
        membresias.save(new Membresia(null, "ana", FAMILIA, Papel.ADULTO, EstadoMembresia.ACTIVA, Instant.now()));

        assertThatThrownBy(() ->
                membresias.save(new Membresia(null, "ana", FAMILIA, Papel.ADULTO, EstadoMembresia.ACTIVA, Instant.now())))
                .isInstanceOf(DuplicateKeyException.class);
    }
}

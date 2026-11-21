package es.cookyourweb.points.deber;

import es.cookyourweb.points.config.SeguridadConfig;
import es.cookyourweb.points.web.LimiteDeCuerpoFiltro;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DeberController.class)
@Import(SeguridadConfig.class)
class DeberControllerTest {

    private static final String BASE = "/api/familias/fA/hijos/leo";
    private static final String E1 = "https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO2/details";
    private static final Instant AHORA = Instant.parse("2027-02-01T10:00:00Z");

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private JsonMapper mapper;
    @MockitoBean
    private JwtDecoder jwtDecoder;
    @MockitoBean
    private DeberService service;

    private static String cuerpo(String extra) {
        return "{\"tipo\":\"EXAMEN\",\"asignatura\":\"Mates\",\"titulo\":\"Examen tema 3\","
                + "\"enlace\":\"" + E1 + "\",\"imprimir\":false,\"isActive\":true" + extra + "}";
    }

    private static MockHttpServletRequestBuilder como(MockHttpServletRequestBuilder b, String json) {
        return b.with(jwt().jwt(j -> j.subject("ana"))).contentType(MediaType.APPLICATION_JSON).content(json);
    }

    private static Deber deber() {
        return new Deber("d1", "fA", "leo", "ana", TipoDeber.EXAMEN, "Mates", LocalDate.of(2027, 2, 10),
                "Examen tema 3", E1, E1, null, null, false, null, true, AHORA, AHORA);
    }

    @Test
    @DisplayName("sin token todo da 401 y no llega al servicio")
    void sinTokenDa401() throws Exception {
        mockMvc.perform(get(BASE + "/deberes")).andExpect(status().isUnauthorized());
        mockMvc.perform(post(BASE + "/deberes").contentType(MediaType.APPLICATION_JSON).content(cuerpo("")))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(put(BASE + "/importaciones-deberes")).andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @Test
    @DisplayName("POST usa familia e hijo de la ruta y el uid del token, aunque el cuerpo traiga otros; 201")
    void crearDevuelve201YUsaLaRuta() throws Exception {
        when(service.crear(eq("ana"), eq("fA"), eq("leo"), any())).thenReturn(deber());

        mockMvc.perform(como(post(BASE + "/deberes"), cuerpo(",\"familyId\":\"fB\",\"clave\":\"x\",\"createdBy\":\"beto\"")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("d1"));
        verify(service).crear(eq("ana"), eq("fA"), eq("leo"), any(DeberCuerpo.class));
    }

    @Test
    @DisplayName("GET lista con soloActivos y PUT edita por id")
    void listarYActualizar() throws Exception {
        when(service.deHijo("ana", "fA", "leo", true)).thenReturn(List.of(deber()));
        when(service.actualizar(eq("ana"), eq("fA"), eq("leo"), eq("d1"), any())).thenReturn(deber());

        mockMvc.perform(get(BASE + "/deberes?soloActivos=true").with(jwt().jwt(j -> j.subject("ana"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value("d1"));
        mockMvc.perform(como(put(BASE + "/deberes/d1"), cuerpo("")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("d1"));
    }

    @Test
    @DisplayName("un enlace javascript: es 400 con campos.enlace")
    void enlaceJavascriptEs400() throws Exception {
        mockMvc.perform(como(post(BASE + "/deberes"),
                        cuerpo("").replace(E1, "javascript:alert(1)")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.enlace").exists());
        verifyNoInteractions(service);
    }

    @Test
    @DisplayName("un enlace nulo o vacio es 400 (no un 500 por NPE)")
    void enlaceObligatorio() throws Exception {
        String sinEnlace = "{\"tipo\":\"EXAMEN\",\"asignatura\":\"Mates\",\"titulo\":\"T\",\"imprimir\":false,\"isActive\":true}";
        mockMvc.perform(como(post(BASE + "/deberes"), sinEnlace))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.enlace").exists());
        mockMvc.perform(como(post(BASE + "/deberes"), cuerpo("").replace(E1, "")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.enlace").exists());
    }

    @Test
    @DisplayName("un enlace no canonico de Classroom es 400")
    void enlaceNoCanonicoEs400() throws Exception {
        mockMvc.perform(como(post(BASE + "/deberes"),
                        cuerpo("").replace(E1, "https://classroom.google.com/u/1/c/EJEMPLO1/a/EJEMPLO2/details")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.enlace").exists());
        mockMvc.perform(como(post(BASE + "/deberes"), cuerpo(",\"examen\":\"" + E1 + "#x\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.examen").exists());
    }

    @Test
    @DisplayName("topes de texto, caracteres de direccion y tipos desconocidos")
    void topes() throws Exception {
        mockMvc.perform(como(post(BASE + "/deberes"), cuerpo("").replace("Examen tema 3", "x".repeat(121))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.titulo").exists());
        mockMvc.perform(como(post(BASE + "/deberes"), cuerpo("").replace("Mates", "x".repeat(61))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.asignatura").exists());
        mockMvc.perform(como(post(BASE + "/deberes"), cuerpo("").replace("Examen tema 3", "Examen‮fdp")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.titulo").exists());
        mockMvc.perform(como(post(BASE + "/deberes"), cuerpo(",\"detalle\":\"a\\u0007b\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.detalle").exists());
        mockMvc.perform(como(post(BASE + "/deberes"), cuerpo(",\"detalle\":\"" + "x".repeat(501) + "\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.detalle").exists());
        mockMvc.perform(como(post(BASE + "/deberes"), cuerpo("").replace("EXAMEN", "DEBER")))
                .andExpect(status().isBadRequest());
        mockMvc.perform(como(post(BASE + "/deberes"), cuerpo("").replace("\"tipo\":\"EXAMEN\",", "")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.tipo").exists());
        verifyNoInteractions(service);
    }

    @Test
    @DisplayName("un id de ruta con caracteres raros (incluida la barra) es 400 y no llega al servicio")
    void idsDeRutaAcotados() throws Exception {
        mockMvc.perform(como(post("/api/familias/fA/hijos/le%20o/deberes"), cuerpo(""))).andExpect(status().isBadRequest());
        // Este si llega al validador de ruta (el %20 lo corta antes el firewall, sin cuerpo): campo por nombre, sin eco del valor (`instance` es la ruta que el cliente mando, Spring la pone siempre).
        mockMvc.perform(como(post("/api/familias/fA/hijos/le.o/deberes"), cuerpo("")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.hijoId").exists())
                .andExpect(jsonPath("$.campos.hijoId").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("le.o"))))
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("le.o"))))
                .andExpect(jsonPath("$.title").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("le.o"))));
        mockMvc.perform(como(post("/api/familias/fA/hijos/le%2Fo/deberes"), cuerpo(""))).andExpect(status().isBadRequest());
        mockMvc.perform(como(post("/api/familias/f.A/hijos/leo/deberes"), cuerpo(""))).andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/familias/fA/hijos/" + "h".repeat(129) + "/deberes").with(jwt().jwt(j -> j.subject("ana"))))
                .andExpect(status().isBadRequest());
        mockMvc.perform(como(put(BASE + "/deberes/d%201"), cuerpo(""))).andExpect(status().isBadRequest());
        mockMvc.perform(put("/api/familias/fA/hijos/le%20o/importaciones-deberes").with(jwt().jwt(j -> j.subject("ana"))))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    @DisplayName("un deber repetido es 409 con titulo fijo")
    void duplicadoEs409() throws Exception {
        when(service.crear(any(), any(), any(), any())).thenThrow(new DeberDuplicadoException());

        mockMvc.perform(como(post(BASE + "/deberes"), cuerpo("")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.title").value("Deber repetido"))
                .andExpect(jsonPath("$.detail").value("ya hay un deber con esa clave"));
    }

    @Test
    @DisplayName("un deber inexistente o ajeno es 404 con titulo fijo")
    void noEncontradoEs404() throws Exception {
        when(service.actualizar(any(), any(), any(), any(), any())).thenThrow(new DeberNoEncontradoException());

        mockMvc.perform(como(put(BASE + "/deberes/d9"), cuerpo("")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Deber no encontrado"))
                .andExpect(jsonPath("$.detail").value("deber no encontrado"));
    }

    @Test
    @DisplayName("PUT importaciones-deberes sin cuerpo registra y devuelve en")
    void registrarImportacion() throws Exception {
        when(service.registrarImportacion("ana", "fA", "leo"))
                .thenReturn(new Importacion("fA/leo", "fA", "leo", "ana", AHORA));

        mockMvc.perform(put(BASE + "/importaciones-deberes").with(jwt().jwt(j -> j.subject("ana"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.en").value("2027-02-01T10:00:00Z"))
                .andExpect(jsonPath("$.uid").doesNotExist());
    }

    @Test
    @DisplayName("sin importaciones previas el GET devuelve {} (sin en)")
    void ultimaSinImportacionesNoTraeEn() throws Exception {
        when(service.ultimaImportacion("ana", "fA", "leo")).thenReturn(Optional.empty());

        mockMvc.perform(get(BASE + "/importaciones-deberes").with(jwt().jwt(j -> j.subject("ana"))))
                .andExpect(status().isOk())
                .andExpect(content().json("{}", true));
    }

    @Test
    @DisplayName("con importacion previa el GET trae en")
    void ultimaConImportacionTraeEn() throws Exception {
        when(service.ultimaImportacion("ana", "fA", "leo"))
                .thenReturn(Optional.of(new Importacion("fA/leo", "fA", "leo", "ana", AHORA)));

        mockMvc.perform(get(BASE + "/importaciones-deberes").with(jwt().jwt(j -> j.subject("ana"))))
                .andExpect(jsonPath("$.en").value("2027-02-01T10:00:00Z"));
    }

    /**
     * GUARDA, verde desde el principio: el record existe desde Task 5 y hoy cabe. Si alguien sube los
     * topes y un deber al maximo (todo en caracteres de 3 bytes) deja de caber en el cuerpo de 16 KB,
     * falla aqui y no con un 413 en produccion a mitad de una importacion.
     */
    @Test
    @DisplayName("guarda: un deber con todos los campos al maximo cabe en el tope de cuerpo")
    void unDeberAlMaximoCabeEnElTope() throws Exception {
        String e = "€";
        String enlaceMaximo = "https://ejemplo.com/" + "a".repeat(480);
        DeberCuerpo maximo = new DeberCuerpo(TipoDeber.MATERIAL, e.repeat(60), LocalDate.of(2027, 12, 31),
                e.repeat(120), enlaceMaximo, e.repeat(500), EstadoEntrega.values()[0], true,
                enlaceMaximo, true);
        byte[] bytes = mapper.writeValueAsString(maximo).getBytes(StandardCharsets.UTF_8);
        assertThat(bytes.length).isLessThan(LimiteDeCuerpoFiltro.MAX_BYTES);
    }
}

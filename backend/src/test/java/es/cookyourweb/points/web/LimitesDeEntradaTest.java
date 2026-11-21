package es.cookyourweb.points.web;

import es.cookyourweb.points.config.SeguridadConfig;
import es.cookyourweb.points.ia.ContenidoMetodoPort;
import es.cookyourweb.points.ia.EleccionTipoController;
import es.cookyourweb.points.ia.EleccionTipoService;
import es.cookyourweb.points.ia.TipoController;
import es.cookyourweb.points.ia.TipoService;
import es.cookyourweb.points.task.Task;
import es.cookyourweb.points.task.TaskController;
import es.cookyourweb.points.task.TaskService;
import es.cookyourweb.points.task.TaskType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * CWE-770: ninguna entrada es ilimitada. Cada campo de texto y cada lista tiene su tope
 * (400 con el formato de "campos" de siempre) y el cuerpo entero tiene un tope global (413).
 * En todos los casos la peticion se corta ANTES de llegar al servicio.
 */
@WebMvcTest({TaskController.class, TipoController.class, EleccionTipoController.class})
@Import(SeguridadConfig.class)
class LimitesDeEntradaTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @MockitoBean
    private TaskService tareas;

    @MockitoBean
    private TipoService tipos;

    @MockitoBean
    private ContenidoMetodoPort contenido;

    @MockitoBean
    private EleccionTipoService elecciones;

    private static String tarea(String nombre, String familyId, String description) {
        return """
                {"nombre":"%s","tipo":"diarias","puntos":5,"familyId":"%s","isActive":true,"description":"%s"}"""
                .formatted(nombre, familyId, description);
    }

    @Test
    @DisplayName("una tarea en el limite exacto (nombre 50, descripcion 200) se crea")
    void tareaEnElLimiteSeCrea() throws Exception {
        when(tareas.crear(eq("uid-1"), any(Task.class))).thenReturn(
                new Task("t-1", "n", TaskType.DIARIAS, 5, "f1", "uid-1", true, null, null, null));

        mockMvc.perform(post("/api/tasks").with(jwt().jwt(j -> j.subject("uid-1")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(tarea("n".repeat(50), "f1", "d".repeat(200))))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("nombre de 51, descripcion de 201 o familyId de 129 dan 400 con cada campo en campos")
    void tareaPasadaDeLimitesDa400() throws Exception {
        mockMvc.perform(post("/api/tasks").with(jwt().jwt(j -> j.subject("uid-1")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(tarea("n".repeat(51), "f".repeat(129), "d".repeat(201))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Datos invalidos"))
                .andExpect(jsonPath("$.campos.nombre").exists())
                .andExpect(jsonPath("$.campos.description").exists())
                .andExpect(jsonPath("$.campos.familyId").exists());
        verifyNoInteractions(tareas);
    }

    @Test
    @DisplayName("un perfil con mas de 100 respuestas da 400 sin llegar al servicio")
    void demasiadasRespuestasDa400() throws Exception {
        StringBuilder sb = new StringBuilder("{\"respuestas\":{");
        for (int i = 0; i < 101; i++) {
            sb.append(i == 0 ? "" : ",").append("\"x").append(i).append("\":\"NUNCA\"");
        }
        sb.append("}}");

        mockMvc.perform(post("/api/ia/tipo/perfil").with(jwt())
                        .contentType(MediaType.APPLICATION_JSON).content(sb.toString()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.respuestas").exists());
        verifyNoInteractions(tipos);
    }

    @Test
    @DisplayName("un cuerpo chunked (sin Content-Length) de mas de 16 KB da 413 de punta a punta, no 400")
    void cuerpoChunkedEnormeDa413() throws Exception {
        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(tarea("n", "f1", "d".repeat(17 * 1024)))
                        .with(LimitesDeEntradaTest::sinContentLength)
                        .with(jwt().jwt(j -> j.subject("uid-1"))))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.title").value("Cuerpo demasiado grande"));
        verifyNoInteractions(tareas);
    }

    /** Copia la peticion en una que dice no saber su longitud, como una chunked real. */
    private static MockHttpServletRequest sinContentLength(MockHttpServletRequest original) {
        MockHttpServletRequest copia = new MockHttpServletRequest(
                original.getServletContext(), original.getMethod(), original.getRequestURI()) {
            @Override
            public long getContentLengthLong() {
                return -1;
            }

            @Override
            public int getContentLength() {
                return -1;
            }
        };
        copia.setContextPath(original.getContextPath());
        copia.setServletPath(original.getServletPath());
        copia.setPathInfo(original.getPathInfo());
        copia.setContentType(original.getContentType());
        copia.setCharacterEncoding(original.getCharacterEncoding());
        copia.setContent(original.getContentAsByteArray());
        for (String nombre : java.util.Collections.list(original.getHeaderNames())) {
            if (!"Content-Length".equalsIgnoreCase(nombre)) {
                copia.addHeader(nombre, original.getHeader(nombre));
            }
        }
        for (String nombre : java.util.Collections.list(original.getAttributeNames())) {
            copia.setAttribute(nombre, original.getAttribute(nombre));
        }
        return copia;
    }

    @Test
    @DisplayName("los nombres de campo del 400 no devuelven las claves que mando el cliente")
    void camposNoHacenEcoDeClavesDelCliente() throws Exception {
        StringBuilder sb = new StringBuilder("{\"respuestas\":{");
        for (int i = 0; i < 30; i++) {
            sb.append(i == 0 ? "" : ",").append("\"eco-del-cliente-").append("z".repeat(40)).append(i)
                    .append("\":\"NUNCA\"");
        }
        sb.append("}}");

        mockMvc.perform(post("/api/ia/tipo/perfil").with(jwt())
                        .contentType(MediaType.APPLICATION_JSON).content(sb.toString()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.respuestas").exists())
                .andExpect(content().string(not(containsString("eco-del-cliente"))));
        verifyNoInteractions(tipos);
    }

    @Test
    @DisplayName("una eleccion con mas de 10 colores o un principal de 33 caracteres da 400 sin llegar al servicio")
    void eleccionPasadaDeLimitesDa400() throws Exception {
        mockMvc.perform(put("/api/familias/f1/hijos/h1/tipo").with(jwt().jwt(j -> j.subject("uid-1")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"colores\":[\"a\",\"b\",\"c\",\"d\",\"e\",\"f\",\"g\",\"h\",\"i\",\"j\",\"k\"],"
                                + "\"principal\":\"" + "p".repeat(33) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.colores").exists())
                .andExpect(jsonPath("$.campos.principal").exists());
        verifyNoInteractions(elecciones);
    }

    @Test
    @DisplayName("un cuerpo de mas de 16 KB da 413 con formato ProblemDetail y no llega al servicio")
    void cuerpoEnormeDa413() throws Exception {
        mockMvc.perform(post("/api/tasks").with(jwt().jwt(j -> j.subject("uid-1")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(tarea("n", "f1", "d".repeat(17 * 1024))))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.status").value(413))
                .andExpect(jsonPath("$.title").value("Cuerpo demasiado grande"));
        verifyNoInteractions(tareas);
    }
}

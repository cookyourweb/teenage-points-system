package es.cookyourweb.points.task;

import es.cookyourweb.points.config.SeguridadConfig;
import es.cookyourweb.points.familia.FamiliaNoEncontradaException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * La capa HTTP de tareas con la seguridad real: lo que se prueba aqui es que el uid
 * que llega al servicio sale del TOKEN y que el 404 de "familia ajena" llega al
 * cliente con su titulo (el handler vive en ManejadorDeErrores).
 */
@WebMvcTest(TaskController.class)
@Import(SeguridadConfig.class)
class TaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    // Evita que la cadena de seguridad intente descargar el JWKS de Google.
    @MockitoBean
    private JwtDecoder jwtDecoder;

    @MockitoBean
    private TaskService service;

    @Test
    @DisplayName("listar pasa al servicio el uid del token")
    void listarPasaElUidDelToken() throws Exception {
        when(service.deFamilia("u1", "f1")).thenReturn(List.of());

        mockMvc.perform(get("/api/tasks").param("familyId", "f1")
                        .with(jwt().jwt(j -> j.subject("u1"))))
                .andExpect(status().isOk());

        verify(service).deFamilia("u1", "f1");
    }

    @Test
    @DisplayName("listar una familia ajena da 404 con el titulo 'Familia no encontrada'")
    void listarFamiliaAjenaDa404ConTitulo() throws Exception {
        when(service.deFamilia("u1", "f2")).thenThrow(new FamiliaNoEncontradaException());

        mockMvc.perform(get("/api/tasks").param("familyId", "f2")
                        .with(jwt().jwt(j -> j.subject("u1"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Familia no encontrada"));
    }

    @Test
    @DisplayName("crear sin createdBy en el cuerpo da 201 y pasa el uid del token")
    void crearSinCreatedByDa201() throws Exception {
        Task creada = new Task("t-1", "Hacer la cama", TaskType.DIARIAS, 5,
                "f1", "u1", true, null, null, null);
        when(service.crear(eq("u1"), any(Task.class))).thenReturn(creada);

        mockMvc.perform(post("/api/tasks")
                        .with(jwt().jwt(j -> j.subject("u1")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre":"Hacer la cama","tipo":"DIARIAS","puntos":5,
                                 "familyId":"f1","isActive":true}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.createdBy").value("u1"));
    }
}

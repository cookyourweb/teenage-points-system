package es.cookyourweb.points.web;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.jayway.jsonpath.JsonPath;
import es.cookyourweb.points.config.SeguridadConfig;
import es.cookyourweb.points.task.TaskController;
import es.cookyourweb.points.task.TaskService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * CWE-209: un error inesperado no le cuenta al cliente nada de las tripas del servidor.
 * El cliente recibe un mensaje generico y un idError; el detalle va al log con ese
 * mismo idError, para poder cruzar la queja del usuario con la traza.
 */
@WebMvcTest(TaskController.class)
@Import(SeguridadConfig.class)
class ErroresSinFugaTest {

    private static final String INTERNO = "Invalid BSON field com.mongodb.internal.Secreto";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @MockitoBean
    private TaskService service;

    private final Logger logger = (Logger) LoggerFactory.getLogger(ManejadorDeErrores.class);
    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();

    @BeforeEach
    void escucharLog() {
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void soltarLog() {
        logger.detachAppender(appender);
    }

    @Test
    @DisplayName("un IllegalArgumentException da 400 generico con idError, y el mensaje solo va al log")
    void argumentoInvalidoNoFiltraElMensaje() throws Exception {
        when(service.deFamilia("u1", "f1")).thenThrow(new IllegalArgumentException(INTERNO));

        String cuerpo = mockMvc.perform(get("/api/tasks").param("familyId", "f1")
                        .with(jwt().jwt(j -> j.subject("u1"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Peticion invalida"))
                .andExpect(jsonPath("$.idError").isNotEmpty())
                .andExpect(content().string(not(containsString("mongodb"))))
                .andExpect(content().string(not(containsString("Secreto"))))
                .andReturn().getResponse().getContentAsString();

        assertLogCruzable(cuerpo);
    }

    @Test
    @DisplayName("una excepcion inesperada da 500 generico con idError, sin clase ni mensaje")
    void inesperadaDa500Generico() throws Exception {
        when(service.deFamilia("u1", "f1")).thenThrow(new IllegalStateException(INTERNO));

        String cuerpo = mockMvc.perform(get("/api/tasks").param("familyId", "f1")
                        .with(jwt().jwt(j -> j.subject("u1"))))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.title").value("Error interno"))
                .andExpect(jsonPath("$.idError").isNotEmpty())
                .andExpect(content().string(not(containsString("IllegalState"))))
                .andExpect(content().string(not(containsString("Secreto"))))
                .andReturn().getResponse().getContentAsString();

        assertLogCruzable(cuerpo);
    }

    @Test
    @DisplayName("los errores propios de Spring MVC conservan su codigo (400 por parametro que falta, 405)")
    void erroresDelFrameworkConservanCodigo() throws Exception {
        mockMvc.perform(get("/api/tasks").with(jwt().jwt(j -> j.subject("u1"))))
                .andExpect(status().isBadRequest());
        mockMvc.perform(patch("/api/tasks/t1").with(jwt().jwt(j -> j.subject("u1"))))
                .andExpect(status().isMethodNotAllowed());
    }

    private void assertLogCruzable(String cuerpo) {
        String idError = JsonPath.read(cuerpo, "$.idError");
        assertThat(appender.list).anySatisfy(evento -> {
            assertThat(evento.getFormattedMessage()).contains(idError);
            String traza = evento.getThrowableProxy() == null ? "" : evento.getThrowableProxy().getMessage();
            assertThat(evento.getFormattedMessage() + traza).contains("Secreto");
        });
    }
}

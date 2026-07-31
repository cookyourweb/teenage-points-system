package es.cookyourweb.points.web;

import es.cookyourweb.points.task.TaskService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import es.cookyourweb.points.task.TaskController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * CORS.
 *
 * El frontend corre en localhost:5173 (Vite) y la API en localhost:8080. Para el
 * navegador son dos origenes distintos, asi que antes de cada peticion que no sea
 * trivial manda una "preflight": un OPTIONS preguntando si le dejan.
 *
 * Si la API no contesta a ese OPTIONS con las cabeceras correctas, el navegador
 * bloquea la llamada y el frontend ve un error de red sin mas detalle. El servidor
 * ni se entera: en sus logs no aparece nada raro.
 *
 * Por eso esto se prueba, y se prueba antes de conectar el frontend: es el primer
 * fallo que aparece en toda migracion de este tipo, y el mas confuso de diagnosticar
 * si te pilla desprevenida.
 */
@WebMvcTest(TaskController.class)
class CorsTest {

    private static final String ORIGEN_DEL_FRONTEND = "http://localhost:5173";

    @Autowired
    private MockMvc mockMvc;

    // El controlador necesita un TaskService para construirse. Aqui no se prueba
    // la logica de negocio, solo las cabeceras, asi que un doble basta.
    @MockitoBean
    private TaskService service;

    @Test
    @DisplayName("la preflight OPTIONS desde el frontend recibe permiso")
    void preflightPermitida() throws Exception {
        mockMvc.perform(options("/api/tasks")
                        .header("Origin", ORIGEN_DEL_FRONTEND)
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", ORIGEN_DEL_FRONTEND));
    }

    @Test
    @DisplayName("los metodos que el frontend necesita estan permitidos")
    void metodosPermitidos() throws Exception {
        // El servicio usa los cuatro: listar, crear, actualizar y borrar.
        // Se comprueba la cabecera y no solo el 200, porque sin CORS configurado
        // el OPTIONS tambien responde 200 y el test pasaria sin probar nada.
        for (String metodo : new String[]{"GET", "POST", "PUT", "DELETE"}) {
            mockMvc.perform(options("/api/tasks")
                            .header("Origin", ORIGEN_DEL_FRONTEND)
                            .header("Access-Control-Request-Method", metodo))
                    .andExpect(status().isOk())
                    .andExpect(header().stringValues("Access-Control-Allow-Methods",
                            org.hamcrest.Matchers.hasItem(org.hamcrest.Matchers.containsString(metodo))));
        }
    }

    @Test
    @DisplayName("una peticion real desde el frontend vuelve con la cabecera de permiso")
    void peticionRealLlevaLaCabecera() throws Exception {
        // Sin esta cabecera en la respuesta real, el navegador descarta el cuerpo
        // aunque el servidor haya respondido 200.
        mockMvc.perform(get("/api/tasks")
                        .param("familyId", "familia-1")
                        .header("Origin", ORIGEN_DEL_FRONTEND))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", ORIGEN_DEL_FRONTEND));
    }

    @Test
    @DisplayName("un origen que no es el frontend no recibe permiso")
    void origenDesconocidoRechazado() throws Exception {
        // Abrir CORS a "*" seria lo comodo, pero esta API va a llevar autenticacion
        // y datos de menores. La lista de origenes es explicita a proposito.
        mockMvc.perform(options("/api/tasks")
                        .header("Origin", "http://sitio-que-no-es-mio.com")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
    }
}

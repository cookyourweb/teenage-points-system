package es.cookyourweb.points.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mock.http.MockHttpInputMessage;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * El camino sin Content-Length (cuerpo chunked): el filtro no puede cortar de antemano,
 * asi que corta mientras se lee, y ese corte acaba en 413 y no en un 400 generico.
 */
class LimiteDeCuerpoFiltroTest {

    @Test
    @DisplayName("sin Content-Length, leer mas de 16 KB lanza CuerpoDemasiadoGrandeException")
    void sinLongitudCortaAlLeer() {
        MockHttpServletRequest peticion = new MockHttpServletRequest("POST", "/api/tasks") {
            @Override
            public long getContentLengthLong() {
                return -1;
            }

            @Override
            public int getContentLength() {
                return -1;
            }
        };
        peticion.setContent(new byte[LimiteDeCuerpoFiltro.MAX_BYTES + 1]);

        assertThatThrownBy(() -> new LimiteDeCuerpoFiltro().doFilter(peticion, new MockHttpServletResponse(),
                (req, res) -> req.getInputStream().readAllBytes()))
                .isInstanceOf(CuerpoDemasiadoGrandeException.class);
    }

    @Test
    @DisplayName("sin Content-Length, leer mas de 16 KB por getReader() tambien se corta")
    void getReaderTambienSeCorta() {
        MockHttpServletRequest peticion = sinLongitud();
        peticion.setContent(new byte[LimiteDeCuerpoFiltro.MAX_BYTES + 1]);

        assertThatThrownBy(() -> new LimiteDeCuerpoFiltro().doFilter(peticion, new MockHttpServletResponse(),
                (req, res) -> {
                    java.io.BufferedReader lector = req.getReader();
                    while (lector.read() != -1) {
                        // leer hasta el final
                    }
                }))
                .isInstanceOf(CuerpoDemasiadoGrandeException.class);
    }

    @Test
    @DisplayName("sin Content-Length, exactamente 16 384 bytes pasan: el tope es 'mas de', no 'desde'")
    void fronteraExactaPasa() throws Exception {
        MockHttpServletRequest peticion = sinLongitud();
        peticion.setContent(new byte[LimiteDeCuerpoFiltro.MAX_BYTES]);
        int[] leidos = {0};

        new LimiteDeCuerpoFiltro().doFilter(peticion, new MockHttpServletResponse(),
                (req, res) -> leidos[0] = req.getInputStream().readAllBytes().length);

        assertThat(leidos[0]).isEqualTo(16_384);
    }

    private static MockHttpServletRequest sinLongitud() {
        return new MockHttpServletRequest("POST", "/api/tasks") {
            @Override
            public long getContentLengthLong() {
                return -1;
            }

            @Override
            public int getContentLength() {
                return -1;
            }
        };
    }

    @Test
    @DisplayName("un fallo de lectura causado por el tope se responde 413, no 400")
    void lecturaCortadaDa413() {
        HttpMessageNotReadableException e = new HttpMessageNotReadableException("I/O error",
                new CuerpoDemasiadoGrandeException(), new MockHttpInputMessage(new byte[0]));

        ProblemDetail p = new ManejadorDeErrores().cuerpoIlegible(e);

        assertThat(p.getStatus()).isEqualTo(413);
        assertThat(p.getTitle()).isEqualTo("Cuerpo demasiado grande");
    }
}

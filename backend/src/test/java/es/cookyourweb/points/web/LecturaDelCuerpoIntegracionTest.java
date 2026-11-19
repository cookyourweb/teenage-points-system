package es.cookyourweb.points.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.multipart.MultipartResolver;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Nadie lee un cuerpo enorme ANTES de Spring Security y de LimiteDeCuerpoFiltro.
 *
 * Servidor real y socket a mano: hace falta la cadena de filtros de verdad (con el orden
 * de Spring Boot) y poder anunciar un Content-Length de 20 MB enviando solo 32 KB. Si
 * algun filtro intenta leer el cuerpo entero, se queda esperando el resto y la respuesta
 * no llega: el test lo ve como "sin respuesta en 5 s". Si no lo lee, llega el 401 al momento.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"app.firebase.project-id=proyecto-test",
                "spring.mongodb.uri=mongodb://localhost:27017/points?serverSelectionTimeoutMS=500"})
class LecturaDelCuerpoIntegracionTest {

    private static final int ENVIADOS = 32 * 1024;

    @LocalServerPort
    private int puerto;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Autowired
    private ApplicationContext contexto;

    /** Manda cabeceras + 32 KB y devuelve la linea de estado, o "SIN RESPUESTA" si no llega en 5 s. */
    private String lineaDeEstado(String cabeceras, byte[] cuerpoParcial) throws Exception {
        try (Socket s = new Socket("localhost", puerto)) {
            s.setSoTimeout(5_000);
            OutputStream out = s.getOutputStream();
            out.write(cabeceras.getBytes(StandardCharsets.US_ASCII));
            out.write(cuerpoParcial);
            out.flush();
            InputStream in = s.getInputStream();
            StringBuilder linea = new StringBuilder();
            try {
                int c;
                while ((c = in.read()) != -1 && c != '\n') {
                    linea.append((char) c);
                }
            } catch (SocketTimeoutException e) {
                return "SIN RESPUESTA";
            }
            return linea.toString().trim();
        }
    }

    @Test
    @DisplayName("PUT form-urlencoded de 20 MB sin token responde al momento sin leer el cuerpo")
    void formularioEnormeNoSeLee() throws Exception {
        byte[] parcial = "a=".concat("x".repeat(ENVIADOS - 2)).getBytes(StandardCharsets.US_ASCII);
        String cabeceras = "PUT /api/tasks/x HTTP/1.1\r\nHost: localhost\r\n"
                + "Content-Type: application/x-www-form-urlencoded\r\n"
                + "Content-Length: " + (20 * 1024 * 1024) + "\r\n\r\n";

        assertThat(lineaDeEstado(cabeceras, parcial)).matches("HTTP/1.1 (401|413).*");
    }

    @Test
    @DisplayName("POST multipart chunked sin token responde al momento sin leer el cuerpo")
    void multipartChunkedNoSeLee() throws Exception {
        String trozo = Integer.toHexString(ENVIADOS) + "\r\n";
        byte[] datos = new byte[ENVIADOS];
        byte[] parcial = new byte[trozo.length() + ENVIADOS + 2];
        System.arraycopy(trozo.getBytes(StandardCharsets.US_ASCII), 0, parcial, 0, trozo.length());
        System.arraycopy(datos, 0, parcial, trozo.length(), ENVIADOS);
        parcial[parcial.length - 2] = '\r';
        parcial[parcial.length - 1] = '\n';
        String cabeceras = "POST /api/tasks HTTP/1.1\r\nHost: localhost\r\n"
                + "Content-Type: multipart/form-data; boundary=XYZ\r\n"
                + "Transfer-Encoding: chunked\r\n\r\n";

        assertThat(lineaDeEstado(cabeceras, parcial)).matches("HTTP/1.1 (401|413).*");
    }

    @Test
    @DisplayName("sin subidas de ficheros no hay MultipartResolver: nadie parsea partes de un cuerpo")
    void sinMultipart() {
        assertThat(contexto.getBeansOfType(MultipartResolver.class)).isEmpty();
    }
}

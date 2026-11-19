package es.cookyourweb.points.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;

/**
 * Tope global de tamano de cuerpo (CWE-770): 16 KB.
 *
 * Por que 16 KB: el cuerpo legitimo mas grande hoy es una tarea (nombre 50 + descripcion
 * 200 caracteres, menos de 2 KB aun con cada caracter escapado como \\uXXXX) o un perfil
 * de 100 respuestas (~4 KB). 16 KB es 4 veces eso y deja sitio a campos nuevos, pero
 * impide que alguien haga parsear a Jackson megas de JSON por peticion.
 *
 * Dos caminos: si llega Content-Length, se corta sin leer nada (413 aqui mismo). Si no
 * llega (chunked), se envuelve el flujo y se corta al pasar el tope mientras se lee; esa
 * excepcion la traduce ManejadorDeErrores a 413.
 *
 * Corre despues de Spring Security (orden por defecto de un Filter: el ultimo): una
 * peticion sin token se rechaza con 401 sin leer su cuerpo, y el 413 lleva cabeceras CORS.
 */
@Component
public class LimiteDeCuerpoFiltro extends OncePerRequestFilter {

    public static final int MAX_BYTES = 16 * 1024;

    /** Mismo formato ProblemDetail que ManejadorDeErrores; aqui aun no hay MVC que lo pinte. */
    static final String CUERPO_413 = "{\"type\":\"about:blank\",\"title\":\"Cuerpo demasiado grande\","
            + "\"status\":413,\"detail\":\"el cuerpo de la peticion supera 16 KB\"}";

    @Override
    protected void doFilterInternal(HttpServletRequest peticion, HttpServletResponse respuesta,
                                    FilterChain cadena) throws ServletException, IOException {
        if (peticion.getContentLengthLong() > MAX_BYTES) {
            respuesta.setStatus(HttpStatus.PAYLOAD_TOO_LARGE.value());
            respuesta.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            respuesta.getOutputStream().write(CUERPO_413.getBytes(StandardCharsets.UTF_8));
            return;
        }
        cadena.doFilter(new PeticionLimitada(peticion), respuesta);
    }

    private static final class PeticionLimitada extends HttpServletRequestWrapper {

        private ServletInputStream limitado;

        PeticionLimitada(HttpServletRequest peticion) {
            super(peticion);
        }

        @Override
        public ServletInputStream getInputStream() throws IOException {
            if (limitado == null) {
                limitado = new FlujoLimitado(super.getInputStream());
            }
            return limitado;
        }

        /**
         * getReader() tambien pasa por el flujo limitado: si no, un lector de texto (un
         * conversor, un parser de formularios) se saltaria el tope leyendo por aqui.
         */
        @Override
        public BufferedReader getReader() throws IOException {
            String codificacion = getCharacterEncoding();
            Charset juego = codificacion == null ? StandardCharsets.UTF_8 : Charset.forName(codificacion);
            return new BufferedReader(new InputStreamReader(getInputStream(), juego));
        }
    }

    private static final class FlujoLimitado extends ServletInputStream {

        private final ServletInputStream original;
        private long leidos;

        FlujoLimitado(ServletInputStream original) {
            this.original = original;
        }

        @Override
        public int read() throws IOException {
            int b = original.read();
            if (b != -1) {
                contar(1);
            }
            return b;
        }

        @Override
        public int read(byte[] destino, int desde, int cuantos) throws IOException {
            int n = original.read(destino, desde, cuantos);
            if (n > 0) {
                contar(n);
            }
            return n;
        }

        private void contar(int n) throws CuerpoDemasiadoGrandeException {
            leidos += n;
            if (leidos > MAX_BYTES) {
                throw new CuerpoDemasiadoGrandeException();
            }
        }

        @Override
        public boolean isFinished() {
            return original.isFinished();
        }

        @Override
        public boolean isReady() {
            return original.isReady();
        }

        @Override
        public void setReadListener(ReadListener oyente) {
            original.setReadListener(oyente);
        }
    }
}

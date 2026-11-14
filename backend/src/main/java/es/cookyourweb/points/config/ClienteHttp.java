package es.cookyourweb.points.config;

import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

/**
 * Un RestClient.Builder con timeouts. Sin ellos, si Firestore no contesta la
 * peticion del usuario se queda colgada para siempre ocupando un hilo.
 */
public final class ClienteHttp {
    private ClienteHttp() {
    }

    public static RestClient.Builder builderConTimeouts(Duration timeout) {
        HttpClient http = HttpClient.newBuilder().connectTimeout(timeout).build();
        JdkClientHttpRequestFactory fabrica = new JdkClientHttpRequestFactory(http);
        fabrica.setReadTimeout(timeout);
        return RestClient.builder().requestFactory(fabrica);
    }
}

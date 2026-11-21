package es.cookyourweb.points.config;


import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Scope;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/** El RestClient.Builder que se inyecta en los adaptadores HTTP, con timeout de 5 s por defecto. */
@Configuration
public class ClienteHttpConfig {

    @Bean
    @Scope("prototype") // como Boot: cada consumidor recibe el suyo
    public RestClient.Builder restClientBuilder(@Value("${app.http.timeout:5s}") Duration timeout) {
        return ClienteHttp.builderConTimeouts(timeout);
    }
}

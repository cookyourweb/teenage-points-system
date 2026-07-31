package es.cookyourweb.points.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Quien puede llamar a esta API desde un navegador.
 *
 * El frontend corre en localhost:5173 y la API en localhost:8080. Para el navegador
 * son dos origenes distintos, y por defecto prohibe que una pagina lea la respuesta
 * de otro origen. Sin esta configuracion, el frontend recibe un error de red y en el
 * servidor no aparece nada: la peticion llega y se responde bien, pero el navegador
 * tira la respuesta a la basura.
 *
 * Se declaran los origenes UNO A UNO en vez de abrir con "*". Aqui se guardan datos
 * de menores y la API va a llevar autenticacion: una lista explicita obliga a decidir
 * a proposito quien entra, en lugar de heredar un permiso que nadie recuerda haber dado.
 *
 * Los origenes se leen de application.properties para que produccion no dependa de
 * recompilar. En local no hace falta configurar nada: el valor por defecto ya es Vite.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final String[] origenesPermitidos;

    public CorsConfig(
            @Value("${app.cors.origenes-permitidos:http://localhost:5173}") String[] origenesPermitidos) {
        this.origenesPermitidos = origenesPermitidos;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(origenesPermitidos)
                // Los cuatro que usa customTaskService.ts, mas OPTIONS para la preflight.
                // No se pone "*": si manana hace falta PATCH, que haya que anadirlo aqui
                // y verlo en el diff.
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("Content-Type")
                // Sin credenciales: la autenticacion ira por cabecera Authorization,
                // no por cookie, asi que el navegador no necesita mandar credenciales
                // de origen cruzado. Activarlo sin necesitarlo solo amplia la superficie.
                .allowCredentials(false)
                // Cuanto puede cachear el navegador la respuesta a la preflight, en
                // segundos. Sin esto, manda un OPTIONS extra antes de CADA peticion.
                .maxAge(3600);
    }
}

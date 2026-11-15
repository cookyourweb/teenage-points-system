package es.cookyourweb.points.ia;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Test de colores. Las respuestas siempre son records dedicados (nunca el
 * dominio): asi el mapa afirmacion->color no puede filtrarse al navegador.
 */
@RestController
@RequestMapping("/api/ia/tipo")
public class TipoController {

    private final ContenidoMetodoPort contenido;
    private final TipoService servicio;

    public TipoController(ContenidoMetodoPort contenido, TipoService servicio) {
        this.contenido = contenido;
        this.servicio = servicio;
    }

    @GetMapping("/preguntas")
    public PreguntasPublicas preguntas() {
        return PreguntasPublicas.de(contenido.contenidoDeTipo());
    }

    @PostMapping("/perfil")
    public PerfilPublico perfil(@RequestBody Respuestas cuerpo) {
        return PerfilPublico.de(servicio.perfil(cuerpo.respuestas()));
    }

    /** Si falta "respuestas" llega null y el servicio lo trata como vacio (400 con todos los ids). */
    public record Respuestas(Map<String, Frecuencia> respuestas) {}
}

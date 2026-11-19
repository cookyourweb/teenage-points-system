package es.cookyourweb.points.ia;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
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
    public PerfilPublico perfil(@Valid @RequestBody Respuestas cuerpo) {
        return PerfilPublico.de(servicio.perfil(cuerpo.respuestas()));
    }

    /**
     * Si falta "respuestas" llega null y el servicio lo trata como vacio (400 con todos los ids).
     * Topes (CWE-770): 100 respuestas y ids de 32 caracteres. El test tiene hoy 10 afirmaciones
     * con ids de 3 (a01..a10); el margen deja crecer el contenido real sin tocar esto, y aun asi
     * nadie manda un mapa de miles de claves para que el servicio lo recorra.
     */
    public record Respuestas(
            @Size(max = 100, message = "no puede haber mas de 100 respuestas")
            Map<@Size(max = 32, message = "un id de afirmacion no pasa de 32 caracteres") String, Frecuencia> respuestas) {}
}

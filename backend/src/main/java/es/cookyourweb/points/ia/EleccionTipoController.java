package es.cookyourweb.points.ia;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

/**
 * Los colores que cada adulto reconoce en su hijo. El uid sale SIEMPRE del token:
 * el cuerpo solo trae colores y principal (cualquier otro campo se ignora).
 */
@RestController
@RequestMapping("/api/familias/{familyId}/hijos/{hijoId}/tipo")
public class EleccionTipoController {

    private final EleccionTipoService servicio;

    public EleccionTipoController(EleccionTipoService servicio) {
        this.servicio = servicio;
    }

    @PutMapping
    public Guardada guardar(@AuthenticationPrincipal Jwt jwt, @PathVariable String familyId,
                            @PathVariable String hijoId, @Valid @RequestBody Cuerpo cuerpo) {
        EleccionTipo e = servicio.guardar(jwt.getSubject(), familyId, hijoId, cuerpo.colores(), cuerpo.principal());
        return new Guardada(e.colores(), e.principal(), e.elegidaEn());
    }

    @GetMapping
    public EleccionTipoService.Listado listar(@AuthenticationPrincipal Jwt jwt, @PathVariable String familyId,
                                              @PathVariable String hijoId) {
        return servicio.listar(jwt.getSubject(), familyId, hijoId);
    }

    /**
     * Topes (CWE-770): hay 5 colores; 10 deja margen sin que la lista sea ilimitada, y el
     * servicio sigue rechazando colores que no existen o repetidos. Ids de color de 32.
     * Estos 400 de tamano salen ANTES de comprobar la familia: no es un oraculo, porque
     * un miembro y un ajeno reciben exactamente el mismo 400 por el mismo cuerpo.
     */
    public record Cuerpo(
            @Size(max = 10, message = "no puede haber mas de 10 colores")
            List<@Size(max = 32, message = "un color no pasa de 32 caracteres") String> colores,
            @Size(max = 32, message = "el principal no pasa de 32 caracteres")
            String principal) {}

    public record Guardada(List<String> colores, String principal, Instant elegidaEn) {}
}

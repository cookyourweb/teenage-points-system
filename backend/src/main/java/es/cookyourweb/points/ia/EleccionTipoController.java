package es.cookyourweb.points.ia;

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
                            @PathVariable String hijoId, @RequestBody Cuerpo cuerpo) {
        EleccionTipo e = servicio.guardar(jwt.getSubject(), familyId, hijoId, cuerpo.colores(), cuerpo.principal());
        return new Guardada(e.colores(), e.principal(), e.elegidaEn());
    }

    @GetMapping
    public EleccionTipoService.Listado listar(@AuthenticationPrincipal Jwt jwt, @PathVariable String familyId,
                                              @PathVariable String hijoId) {
        return servicio.listar(jwt.getSubject(), familyId, hijoId);
    }

    public record Cuerpo(List<String> colores, String principal) {}

    public record Guardada(List<String> colores, String principal, Instant elegidaEn) {}
}

package es.cookyourweb.points.deber;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

/**
 * Deberes de un hijo. familyId y hijoId salen de la RUTA y el uid del TOKEN; el cuerpo solo trae
 * los campos de DeberCuerpo (cualquier otro se ignora). Los ids de ruta se acotan: la importacion
 * se guarda con id "familyId/hijoId", asi que una barra en uno de ellos haria colisionar dos hijos.
 */
@RestController
@RequestMapping("/api/familias/{familyId}/hijos/{hijoId}")
public class DeberController {

    private static final String ID = "[A-Za-z0-9_-]{1,128}";
    private static final String MSG = "el identificador no es valido";

    private final DeberService servicio;

    public DeberController(DeberService servicio) {
        this.servicio = servicio;
    }

    @GetMapping("/deberes")
    public List<Deber> listar(@AuthenticationPrincipal Jwt jwt,
                              @PathVariable @Pattern(regexp = ID, message = MSG) String familyId,
                              @PathVariable @Pattern(regexp = ID, message = MSG) String hijoId,
                              @RequestParam(defaultValue = "false") boolean soloActivos) {
        return servicio.deHijo(jwt.getSubject(), familyId, hijoId, soloActivos);
    }

    @PostMapping("/deberes")
    @ResponseStatus(HttpStatus.CREATED)
    public Deber crear(@AuthenticationPrincipal Jwt jwt,
                       @PathVariable @Pattern(regexp = ID, message = MSG) String familyId,
                       @PathVariable @Pattern(regexp = ID, message = MSG) String hijoId,
                       @Valid @RequestBody DeberCuerpo cuerpo) {
        return servicio.crear(jwt.getSubject(), familyId, hijoId, cuerpo);
    }

    @PutMapping("/deberes/{id}")
    public Deber actualizar(@AuthenticationPrincipal Jwt jwt,
                            @PathVariable @Pattern(regexp = ID, message = MSG) String familyId,
                            @PathVariable @Pattern(regexp = ID, message = MSG) String hijoId,
                            @PathVariable @Pattern(regexp = ID, message = MSG) String id,
                            @Valid @RequestBody DeberCuerpo cuerpo) {
        return servicio.actualizar(jwt.getSubject(), familyId, hijoId, id, cuerpo);
    }

    @PutMapping("/importaciones-deberes")
    public Ultima registrarImportacion(@AuthenticationPrincipal Jwt jwt,
                                       @PathVariable @Pattern(regexp = ID, message = MSG) String familyId,
                                       @PathVariable @Pattern(regexp = ID, message = MSG) String hijoId) {
        return new Ultima(servicio.registrarImportacion(jwt.getSubject(), familyId, hijoId).en());
    }

    /** Sin importaciones previas devuelve {} (el JSON no lleva nulos). */
    @GetMapping("/importaciones-deberes")
    public Ultima ultimaImportacion(@AuthenticationPrincipal Jwt jwt,
                                    @PathVariable @Pattern(regexp = ID, message = MSG) String familyId,
                                    @PathVariable @Pattern(regexp = ID, message = MSG) String hijoId) {
        return new Ultima(servicio.ultimaImportacion(jwt.getSubject(), familyId, hijoId)
                .map(Importacion::en).orElse(null));
    }

    public record Ultima(Instant en) {}
}

package es.cookyourweb.points.deber;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Las mismas reglas que esEnlaceSeguro (src/utils/deberes/enlaces.ts), porque el navegador no es
 * frontera. Y ademas el back NO normaliza: si el enlace no esta ya en forma canonica lo RECHAZA,
 * asi la clave que calcula Java (URI) coincide siempre con la de JS (URL) sin depender de que
 * las dos librerias reescriban igual. Por eso solo se admite ASCII visible: sin espacios, control,
 * direccion ni Unicode (que JS convertiria a punycode o percent-encoding).
 */
public class EnlaceSeguroValidator implements ConstraintValidator<EnlaceSeguro, String> {

    static final int MAX = 500;
    private static final String HOST_CLASSROOM = "classroom.google.com";
    private static final Pattern CUENTA = Pattern.compile("^/u/\\d+(?=/|$)");
    // Classroom: JS reserializa el query al borrar authuser (espacio -> '+'); solo pares nombre=valor con
    // caracteres que esa serializacion no cambia. Sin %XX a proposito: el front tambien los rechaza
    // en Classroom, porque aceptarlos exigiria reproducir aqui el decode/encode exacto de URLSearchParams.
    private static final Pattern CONSULTA_CANONICA =
            Pattern.compile("[A-Za-z0-9_.*+-]+=[A-Za-z0-9_.*+-]*(&[A-Za-z0-9_.*+-]+=[A-Za-z0-9_.*+-]*)*");

    @Override
    public boolean isValid(String valor, ConstraintValidatorContext contexto) {
        return valor == null || esSeguro(valor);
    }

    static boolean esSeguro(String texto) {
        if (texto == null || texto.isEmpty() || texto.length() > MAX) return false;
        for (int i = 0; i < texto.length(); i++) {
            char c = texto.charAt(i);
            if (c < 0x21 || c > 0x7E || c == '\\') return false;
        }
        if (!texto.startsWith("https://")) return false;
        URI uri;
        try {
            uri = new URI(texto);
        } catch (URISyntaxException e) {
            return false;
        }
        // La comilla simple la reescribe JS como %27 SOLO en el query; en la ruta se queda igual.
        if (uri.getRawQuery() != null && uri.getRawQuery().indexOf('\'') >= 0) return false;
        if (uri.getRawUserInfo() != null || uri.getHost() == null) return false;
        String host = uri.getHost();
        if (host.startsWith("[") || host.endsWith(".")) return false;
        if (!host.contains(".")) return false;
        for (String etiqueta : host.split("\\.", -1)) {
            if (etiqueta.isEmpty()) return false;
        }
        if (host.chars().allMatch(c -> c == '.' || (c >= '0' && c <= '9'))) return false;
        String bajas = host.toLowerCase(Locale.ROOT);
        if (bajas.equals("localhost") || bajas.endsWith(".localhost")) return false;

        String ruta = uri.getRawPath() == null ? "" : uri.getRawPath();
        for (String segmento : ruta.split("/", -1)) {
            String s = segmento.toLowerCase(Locale.ROOT).replace("%2e", ".");
            if (s.equals(".") || s.equals("..")) return false;
        }
        return !bajas.equals(HOST_CLASSROOM) || esClassroomCanonico(host, ruta, uri.getRawQuery(), uri.getRawFragment());
    }

    private static boolean esClassroomCanonico(String host, String ruta, String consulta, String ancla) {
        if (!host.equals(HOST_CLASSROOM) || ancla != null) return false;
        if (ruta.endsWith("/") || CUENTA.matcher(ruta).find()) return false;
        if (consulta == null) return true;
        if (!CONSULTA_CANONICA.matcher(consulta).matches()) return false;
        for (String par : consulta.split("&")) {
            if (par.startsWith("authuser=")) return false;
        }
        return true;
    }
}

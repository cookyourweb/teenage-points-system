package es.cookyourweb.points.deber;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Las mismas reglas que esEnlaceSeguro de src/utils/deberes/enlaces.ts: el navegador no es frontera. */
class EnlaceSeguroValidatorTest {

    private static final String E1 = "https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO2/details";

    // Copia de MALOS de src/__tests__/deberesEnlaces.test.ts: si cambia alli, cambia aqui.
    private static final List<String> MALOS = List.of(
            "javascript:alert(1)",
            "JAVASCRIPT:alert(1)",
            "http://classroom.google.com/c/EJEMPLO1",
            "data:text/html,hola",
            "https://usuario:clave@ejemplo.com/",
            "https://exa mple.com/",
            "https://localhost/",
            "https://127.0.0.1/",
            "https://[::1]/",
            "//ejemplo.com/x",
            "https://ejemplo.com/‮exe",
            "https://ejemplo.com/\u0007",
            "https://ejemplo.com/" + "a".repeat(500),
            "https://localhost./",
            "https://foo.localhost./",
            "https://a..b/",
            "https://.com/",
            "https:ejemplo.com",
            "https:/ejemplo.com",
            "https:\\\\ejemplo.com/x",
            "https://ejemplo.com/\u007F",
            "https://ejemplo.com/\tx",
            "https://ejemplo.com/\nx",
            "https://classroom.google.com./",
            "https://classroom.google.com./u/0/c/EJEMPLO/a/EJEMPLO1",
            "https://ejemplo.com./x");

    @Test
    @DisplayName("rechaza lo mismo que el front y acepta el enlace bueno")
    void rechazaLoMismoQueElFront() {
        assertThat(EnlaceSeguroValidator.esSeguro(E1)).isTrue();
        for (String malo : MALOS) {
            assertThat(EnlaceSeguroValidator.esSeguro(malo)).as(malo).isFalse();
        }
    }

    @Test
    @DisplayName("Classroom solo en forma canonica: no se normaliza, se rechaza")
    void classroomSoloEnFormaCanonica() {
        assertThat(EnlaceSeguroValidator.esSeguro("https://classroom.google.com/u/1/c/EJEMPLO1/a/EJEMPLO2/details")).isFalse();
        assertThat(EnlaceSeguroValidator.esSeguro(E1 + "?authuser=1")).isFalse();
        assertThat(EnlaceSeguroValidator.esSeguro(E1 + "?a=1&authuser=1")).isFalse();
        assertThat(EnlaceSeguroValidator.esSeguro(E1 + "?auth%75ser=1")).isFalse();
        assertThat(EnlaceSeguroValidator.esSeguro(E1 + "/")).isFalse();
        assertThat(EnlaceSeguroValidator.esSeguro(E1 + "#x")).isFalse();
        assertThat(EnlaceSeguroValidator.esSeguro("https://Classroom.Google.com/c/EJEMPLO1/a/EJEMPLO2/details")).isFalse();
        assertThat(EnlaceSeguroValidator.esSeguro(E1)).isTrue();
        assertThat(EnlaceSeguroValidator.esSeguro(E1 + "?cid=EJEMPLO3")).isTrue();
        assertThat(EnlaceSeguroValidator.esSeguro("https://www.youtube.com/watch?v=EJEMPLO5")).isTrue();
    }

    @Test
    @DisplayName("lo que JS reescribiria y Java no: se rechaza para que las dos claves coincidan")
    void noCanonicoSeRechaza() {
        assertThat(EnlaceSeguroValidator.esSeguro("https://ejemplo.com/a/../b")).isFalse();
        assertThat(EnlaceSeguroValidator.esSeguro("https://ejemplo.com/a/./b")).isFalse();
        assertThat(EnlaceSeguroValidator.esSeguro("https://ejemplo.com/a/%2e%2e/b")).isFalse();
        assertThat(EnlaceSeguroValidator.esSeguro("https://ejemplo.com/niño")).isFalse();
        assertThat(EnlaceSeguroValidator.esSeguro("https://ejemplo.com/ x")).isFalse();
        assertThat(EnlaceSeguroValidator.esSeguro("https://ejemplo.com/?q='x'")).isFalse();
        assertThat(EnlaceSeguroValidator.esSeguro("HTTPS://ejemplo.com/x")).isFalse();
        assertThat(EnlaceSeguroValidator.esSeguro("https://ejemplo.com/x")).isTrue();
        assertThat(EnlaceSeguroValidator.esSeguro("https://ejemplo.com/x#ancla")).isTrue();
    }

    // Espejo de BUENOS_DEL_FRONT y MALOS_NUEVOS en src/__tests__/deberesEnlaces.test.ts: lo que el
    // front da por canonico, el back lo acepta (si no, el POST fallaria tras ver el aviso verde).
    @Test
    @DisplayName("acepta lo que el front produce como canonico")
    void aceptaLoQueElFrontProduce() {
        assertThat(EnlaceSeguroValidator.esSeguro(E1 + "?q=a+b")).isTrue();
        assertThat(EnlaceSeguroValidator.esSeguro("https://ejemplo.com/l'eau.pdf")).isTrue();
    }

    @Test
    @DisplayName("rechaza lo que java.net.URI no sabe leer o el query de Classroom con %XX (el front tambien)")
    void rechazaLoQueElFrontTambienRechaza() {
        for (String malo : List.of("https://ejemplo.com/a|b", "https://ejemplo.com/x?a=b|c",
                "https://ejemplo.com/x?a=b^c", "https://ejemplo.com/x?a={b}",
                "https://ejemplo.com/x?q='a'", E1 + "?q=a%2Fb", E1 + "?x=a!b", E1 + "?x=a~b",
                E1 + "?x=(a)", E1 + "?x=a:b")) {
            assertThat(EnlaceSeguroValidator.esSeguro(malo)).as(malo).isFalse();
        }
    }

    @Test
    @DisplayName("nulo vale para el validador (el @NotBlank del enlace lo exige aparte)")
    void nuloVale() {
        assertThat(new EnlaceSeguroValidator().isValid(null, null)).isTrue();
    }
}

package sanitize

import (
	"strings"
	"testing"
)

// Casos reales que arma editorExport.js: si documentToHtml empieza a emitir
// una propiedad CSS nueva y esta lista blanca no la sigue, un diseño
// publicado pierde ese estilo en silencio (así se coló el bug del fondo
// que desaparecía al publicar). No comparamos el string completo porque
// bluemonday reformatea separadores (": ", "; ", sin ";" final); en cambio
// verificamos que cada declaración individual sobreviva intacta.
func TestHTML_PreservaEstilosDelExportador(t *testing.T) {
	cases := []struct {
		in            string
		declaraciones []string
	}{
		{
			in:            `<div style="position:relative;width:900px;height:1500px;background:#F8F3E8;overflow:hidden;"></div>`,
			declaraciones: []string{"background: #F8F3E8"},
		},
		{
			in:            `<div style="position:relative;width:800px;height:1000px;background:linear-gradient(90deg, #FD761A, #FFE8D6);overflow:hidden;"></div>`,
			declaraciones: []string{"background: linear-gradient(90deg, #FD761A, #FFE8D6)"},
		},
		{
			in: `<div style="position:absolute;left:80px;top:80px;width:280px;height:60px;z-index:1;box-sizing:border-box;opacity:0.9;font-family:Inter, sans-serif;font-size:24px;color:#111827;font-weight:600;text-align:left;letter-spacing:1.5px;line-height:1.2;text-shadow:0 0 10px rgba(0, 0, 0, 0.35);overflow:hidden;">Hola</div>`,
			declaraciones: []string{
				"box-sizing: border-box", "opacity: 0.9", "letter-spacing: 1.5px",
				"line-height: 1.2", "text-shadow: 0 0 10px rgba(0, 0, 0, 0.35)",
			},
		},
		{
			in: `<div style="position:absolute;left:100px;top:100px;width:160px;height:160px;z-index:2;box-sizing:border-box;opacity:1;background:linear-gradient(90deg, #FD761A, #FFE8D6);border-radius:8px;border:2px solid #111827;box-shadow:0 0 12px rgba(0, 0, 0, 0.35);"></div>`,
			declaraciones: []string{
				"background: linear-gradient(90deg, #FD761A, #FFE8D6)",
				"border: 2px solid #111827", "box-shadow: 0 0 12px rgba(0, 0, 0, 0.35)",
			},
		},
		{
			in:            `<div style="position:absolute;left:0px;top:0px;width:50px;height:50px;z-index:3;box-sizing:border-box;opacity:1;background:#FD761A;border-radius:50%;filter:blur(20px);"></div>`,
			declaraciones: []string{"filter: blur(20px)"},
		},
		{
			in: `<img src="https://example.com/foo.png" alt="" style="position:absolute;left:120px;top:120px;width:240px;height:240px;z-index:4;box-sizing:border-box;opacity:1;object-fit:cover;filter:brightness(110%) contrast(105%) grayscale(0%) drop-shadow(0 0 8px rgba(0, 0, 0, 0.35));clip-path:circle(50% at 50% 50%);" />`,
			declaraciones: []string{
				"filter: brightness(110%) contrast(105%) grayscale(0%) drop-shadow(0 0 8px rgba(0, 0, 0, 0.35))",
				"clip-path: circle(50% at 50% 50%)",
			},
		},
	}

	for _, tc := range cases {
		out := HTML(tc.in)
		for _, decl := range tc.declaraciones {
			if !strings.Contains(out, decl) {
				t.Errorf("se perdió %q\n  in:  %s\n  out: %s", decl, tc.in, out)
			}
		}
	}
}

// El bloque de plato vinculado tiene que sobrevivir entero: si se pierden
// los data-kk-*, el menú público ya no puede poner el precio actual.
func TestHTML_PreservaBloqueDePlato(t *testing.T) {
	in := `<div data-kk-producto="42" style="position:absolute;left:10px;top:20px;width:300px;height:80px;z-index:5;box-sizing:border-box;opacity:1;font-family:Inter, sans-serif;color:#111827;display:flex;flex-direction:column;gap:6px;overflow:hidden;">` +
		`<div style="display:flex;justify-content:space-between;align-items:baseline;gap:11px;font-size:22px;font-weight:700;line-height:1.2;">` +
		`<span data-kk-campo="nombre">Lomo saltado</span><span data-kk-campo="precio" style="color:#FD761A;flex-shrink:0;white-space:nowrap;">S/ 32.00</span></div>` +
		`<div data-kk-campo="descripcion" style="font-size:14px;line-height:1.35;opacity:0.8;font-weight:400;">Con papas</div></div>`
	out := HTML(in)
	for _, esperado := range []string{
		`data-kk-producto="42"`, `data-kk-campo="nombre"`, `data-kk-campo="precio"`, `data-kk-campo="descripcion"`,
		"display: flex", "flex-direction: column", "justify-content: space-between", "align-items: baseline",
		"gap: 11px", "flex-shrink: 0", "white-space: nowrap",
	} {
		if !strings.Contains(out, esperado) {
			t.Errorf("se perdió %q\n  out: %s", esperado, out)
		}
	}

	malo := HTML(`<div data-kk-producto="1 onclick=x" data-kk-campo="otro">x</div>`)
	if strings.Contains(malo, "data-kk") {
		t.Errorf("dejó pasar un data-kk inválido: %s", malo)
	}
}

func TestHTML_BloqueaCSSPeligroso(t *testing.T) {
	cases := []string{
		`<script>alert(1)</script>`,
		`<div onclick="alert(1)">x</div>`,
		`<div style="background:url(javascript:alert(1));">x</div>`,
		`<div style="background:url(https://evil.example/track.png);">x</div>`,
		`<style>body{background:url(x)}</style>`,
	}

	for _, in := range cases {
		out := HTML(in)
		if strings.Contains(out, "url(") || strings.Contains(out, "onclick") ||
			strings.Contains(out, "<script") || strings.Contains(out, "alert(") {
			t.Errorf("dejó pasar algo peligroso:\n  in:  %s\n  out: %s", in, out)
		}
	}
}

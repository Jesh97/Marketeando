// Package sanitize limpia el HTML compilado por el editor visual antes de
// guardarlo en base de datos, para que nunca se persista markup capaz de
// ejecutar script (XSS) aunque el cliente esté comprometido o manipulado.
package sanitize

import (
	"regexp"

	"github.com/microcosm-cc/bluemonday"
)

var (
	pxValue      = regexp.MustCompile(`^-?[0-9]+(\.[0-9]+)?px$`)
	pxOrPercent  = regexp.MustCompile(`^[0-9]+(\.[0-9]+)?(px|%)$`)
	hexColor     = regexp.MustCompile(`^#[0-9a-fA-F]{3}([0-9a-fA-F]{3}([0-9a-fA-F]{2})?)?$`)
	rotateDeg    = regexp.MustCompile(`^rotate\(-?[0-9]+(\.[0-9]+)?deg\)$`)
	fontFamily   = regexp.MustCompile(`^[a-zA-Z0-9 ,'"._-]+$`)
	unitlessNum  = regexp.MustCompile(`^[0-9]+(\.[0-9]+)?$`)
	clipPathEnum = []string{
		"circle(50% at 50% 50%)",
		"ellipse(50% 50% at 50% 50%)",
		"polygon(50% 0%, 0% 100%, 100% 100%)",
		"polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
		"polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
	}

	hexColorSrc    = `#[0-9a-fA-F]{3}([0-9a-fA-F]{3}([0-9a-fA-F]{2})?)?`
	rgbaColorSrc   = `rgba\([0-9]{1,3}, ?[0-9]{1,3}, ?[0-9]{1,3}, ?[0-9]+(\.[0-9]+)?\)`
	shadowColorSrc = `(` + hexColorSrc + `|` + rgbaColorSrc + `)`

	// Mismas formas que emite canvasBackgroundCss/fillStyle en
	// editorExport.js para fondo sólido o degradado (el fondo de grilla no
	// entra acá a propósito: su patrón multi-capa es mucho más difícil de
	// validar con una sola regex, así que un diseño con fondo "Grilla" pierde
	// ese patrón al publicarse, mostrando solo el fondo de la página).
	backgroundValue = regexp.MustCompile(
		`^(` + hexColorSrc + `|linear-gradient\(-?[0-9]+(\.[0-9]+)?deg, ?` + hexColorSrc + `, ?` + hexColorSrc + `\))$`,
	)
	// text-shadow y box-shadow: mismo "0 0 <px> <color>" que arma shadowColor
	// (hex por defecto o rgba() calculado en hexToRgba) en EditorCanvas.jsx.
	shadowValue = regexp.MustCompile(`^0 0 [0-9]+(\.[0-9]+)?px ` + shadowColorSrc + `$`)
	borderValue = regexp.MustCompile(`^[0-9]+(\.[0-9]+)?px solid ` + hexColorSrc + `$`)
	// filter: o el blur() de una forma, o la cadena fija
	// brightness+contrast+grayscale(+drop-shadow) que arma una imagen.
	filterValue = regexp.MustCompile(
		`^(blur\([0-9]+(\.[0-9]+)?px\)` +
			`|brightness\([0-9]+(\.[0-9]+)?%\) contrast\([0-9]+(\.[0-9]+)?%\) grayscale\([0-9]+(\.[0-9]+)?%\)` +
			`( drop-shadow\(0 0 [0-9]+(\.[0-9]+)?px ` + shadowColorSrc + `\))?)$`,
	)

	// Política estricta: solo las etiquetas y estilos que el exportador del
	// editor genera. Nada de <script>, <style>, event handlers, ni CSS
	// arbitrario (url(), expression(), etc.) puede colarse aquí.
	policy = buildPolicy()
)

func buildPolicy() *bluemonday.Policy {
	p := bluemonday.NewPolicy()

	elements := []string{"div", "span", "p", "img", "b", "strong", "i", "em", "br", "a"}
	p.AllowElements("br")
	p.AllowAttrs("style").OnElements("div", "span", "p", "img", "a")
	p.AllowAttrs("src", "alt").OnElements("img")
	p.AllowAttrs("href", "target", "rel").OnElements("a")
	p.AllowURLSchemes("https", "http", "data")
	p.RequireNoFollowOnLinks(true)
	p.AddTargetBlankToFullyQualifiedLinks(true)

	for _, el := range elements {
		p.AllowStyles("position").MatchingEnum("absolute", "relative").OnElements(el)
		p.AllowStyles("box-sizing").MatchingEnum("border-box").OnElements(el)
		p.AllowStyles("left", "top", "width", "height").Matching(pxValue).OnElements(el)
		p.AllowStyles("transform").Matching(rotateDeg).OnElements(el)
		p.AllowStyles("z-index").Matching(regexp.MustCompile(`^[0-9]+$`)).OnElements(el)
		p.AllowStyles("background-color", "color", "border-color").Matching(hexColor).OnElements(el)
		p.AllowStyles("background").Matching(backgroundValue).OnElements(el)
		p.AllowStyles("font-size").Matching(pxValue).OnElements(el)
		p.AllowStyles("font-family").Matching(fontFamily).OnElements(el)
		p.AllowStyles("font-weight").MatchingEnum(
			"normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900",
		).OnElements(el)
		p.AllowStyles("text-align").MatchingEnum("left", "center", "right", "justify").OnElements(el)
		p.AllowStyles("border-radius").Matching(pxOrPercent).OnElements(el)
		p.AllowStyles("object-fit").MatchingEnum("cover", "contain", "fill").OnElements(el)
		p.AllowStyles("overflow").MatchingEnum("hidden", "visible").OnElements(el)
		p.AllowStyles("opacity").Matching(unitlessNum).OnElements(el)
		p.AllowStyles("letter-spacing").Matching(pxValue).OnElements(el)
		p.AllowStyles("line-height").Matching(unitlessNum).OnElements(el)
		p.AllowStyles("text-shadow", "box-shadow").Matching(shadowValue).OnElements(el)
		p.AllowStyles("border").Matching(borderValue).OnElements(el)
		p.AllowStyles("filter").Matching(filterValue).OnElements(el)
		p.AllowStyles("clip-path").MatchingEnum(clipPathEnum...).OnElements(el)
	}

	return p
}

// HTML devuelve una copia segura de input, con cualquier etiqueta, atributo
// o propiedad CSS no permitida eliminada.
func HTML(input string) string {
	return policy.Sanitize(input)
}

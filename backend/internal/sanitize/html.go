// Package sanitize limpia el HTML compilado por el editor visual antes de
// guardarlo en base de datos, para que nunca se persista markup capaz de
// ejecutar script (XSS) aunque el cliente esté comprometido o manipulado.
package sanitize

import (
	"regexp"

	"github.com/microcosm-cc/bluemonday"
)

var (
	pxValue     = regexp.MustCompile(`^-?[0-9]+(\.[0-9]+)?px$`)
	pxOrPercent = regexp.MustCompile(`^[0-9]+(\.[0-9]+)?(px|%)$`)
	hexColor    = regexp.MustCompile(`^#[0-9a-fA-F]{3}([0-9a-fA-F]{3}([0-9a-fA-F]{2})?)?$`)
	rotateDeg   = regexp.MustCompile(`^rotate\(-?[0-9]+(\.[0-9]+)?deg\)$`)
	fontFamily  = regexp.MustCompile(`^[a-zA-Z0-9 ,'"._-]+$`)

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
		p.AllowStyles("left", "top", "width", "height").Matching(pxValue).OnElements(el)
		p.AllowStyles("transform").Matching(rotateDeg).OnElements(el)
		p.AllowStyles("z-index").Matching(regexp.MustCompile(`^[0-9]+$`)).OnElements(el)
		p.AllowStyles("background-color", "color", "border-color").Matching(hexColor).OnElements(el)
		p.AllowStyles("font-size").Matching(pxValue).OnElements(el)
		p.AllowStyles("font-family").Matching(fontFamily).OnElements(el)
		p.AllowStyles("font-weight").MatchingEnum(
			"normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900",
		).OnElements(el)
		p.AllowStyles("text-align").MatchingEnum("left", "center", "right", "justify").OnElements(el)
		p.AllowStyles("border-radius").Matching(pxOrPercent).OnElements(el)
		p.AllowStyles("object-fit").MatchingEnum("cover", "contain", "fill").OnElements(el)
		p.AllowStyles("overflow").MatchingEnum("hidden", "visible").OnElements(el)
	}

	return p
}

// HTML devuelve una copia segura de input, con cualquier etiqueta, atributo
// o propiedad CSS no permitida eliminada.
func HTML(input string) string {
	return policy.Sanitize(input)
}

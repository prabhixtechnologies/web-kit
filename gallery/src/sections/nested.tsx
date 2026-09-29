import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@prabhixtechnologies/ui";
import { BRANDS, LABELS } from "../brands";
import { Shot } from "../shot";

/*
  A brand applied below the root, which is the case that matters most and is the hardest to see.

  The single-colour bug lived exactly here. `--color-primary: var(--px-accent)` was declared in
  a plain `@theme`, which emits it on `:root`. Custom properties are substituted at
  computed-value time on the element that declares them, so the alias resolved once at the root
  and every descendant inherited a finished colour. A `[data-brand]` on <html> still worked -
  the root is where the alias was resolving - so all four applications looked correct and the
  bug was invisible. What did not work was a brand scope *inside* a page: a MobiStack panel in
  the OneOps console rendered in OneOps indigo.

  That distinction is why this section exists. A gallery that only set the brand on <html> can
  be photographed under the bug and under the fix and produce identical pictures, which was
  confirmed by planting the bug and watching every other test here pass.
*/
export function Nested() {
  return (
    <Shot name="nested-brands">
      <div className="grid w-full gap-3 lg:grid-cols-3">
        {BRANDS.map((brand) => (
          <div key={brand} data-brand={brand} data-nested={brand}>
            <Card padded>
              <CardHeader>
                <CardTitle className="text-sm">{LABELS[brand] ?? brand}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm">Primary</Button>
                  <Button size="sm" variant="brand">
                    Brand
                  </Button>
                  <Badge>Badge</Badge>
                </div>
                <Alert tone="info" title="Scoped">
                  This panel is {brand}.
                </Alert>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </Shot>
  );
}

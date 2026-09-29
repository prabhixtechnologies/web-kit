import * as React from "react";
import {
  Badge,
  Button,
  Checkbox,
  Combobox,
  Field,
  FieldControl,
  FieldHint,
  FieldLabel,
  FileDropzone,
  Form,
  FormActions,
  Input,
  Kbd,
  Label,
  RadioCard,
  RadioGroup,
  RadioGroupItem,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  TAG_TONES,
  Textarea,
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
} from "@prabhixtechnologies/ui";
import { Bold, Italic, Underline } from "lucide-react";
import { Group, Shot } from "../shot";

const BUTTON_VARIANTS = ["default", "destructive", "brand", "outline", "secondary", "ghost", "link"] as const;
const BUTTON_SIZES = ["xs", "sm", "default", "lg"] as const;
const BADGE_VARIANTS = ["default", "secondary", "destructive", "outline", "success", "warning"] as const;

export function Controls() {
  // Fixed initial state, never advanced by the gallery itself. Anything that moves without an
  // interaction is a screenshot that differs from itself.
  const [view, setView] = React.useState<"all" | "open" | "done">("open");
  const [city, setCity] = React.useState<string | null>("nagpur");
  const [marks, setMarks] = React.useState<string[]>(["bold"]);

  return (
    <>
      <Shot name="button-variants">
        {BUTTON_VARIANTS.map((variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ))}
        <Button disabled>disabled</Button>
      </Shot>

      <Shot name="button-sizes">
        {BUTTON_SIZES.map((size) => (
          <Button key={size} size={size}>
            {size}
          </Button>
        ))}
        <Button size="lg" variant="brand">
          Place order
        </Button>
      </Shot>

      <Shot name="badges">
        <Group label="variants">
          {BADGE_VARIANTS.map((variant) => (
            <Badge key={variant} variant={variant}>
              {variant}
            </Badge>
          ))}
        </Group>
        {/* All fifteen generated swatches. The tag ramp is per theme, so this block is the
            densest colour signal on the page and the first thing a brand mix-up shows up in. */}
        <Group label="tones">
          {TAG_TONES.map((tone) => (
            <Badge key={tone} tone={tone}>
              {tone}
            </Badge>
          ))}
        </Group>
      </Shot>

      <Shot name="text-inputs">
        <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="g-email">Email</Label>
            <Input id="g-email" defaultValue="ops@example.test" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="g-ref">Reference</Label>
            <Input id="g-ref" placeholder="INV-1041" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="g-off">Disabled</Label>
            <Input id="g-off" defaultValue="Locked" disabled />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="g-note">Note</Label>
            <Textarea id="g-note" rows={3} defaultValue={"Collected at the Nagpur branch.\nTwo boxes."} />
          </div>
        </div>
      </Shot>

      <Shot name="form-field-states">
        {/* The error is passed to Field rather than rendered as a FieldError, because presence
            of the message is what drives aria-invalid and the red border together. Call sites
            take this path; a gallery that took the other one would photograph a state the
            products cannot reach. */}
        <Form className="w-full max-w-xl">
          <Field hint required>
            <FieldLabel>Street</FieldLabel>
            <FieldHint>Where the courier should knock.</FieldHint>
            <FieldControl>
              <Input defaultValue="14 Palm Road" />
            </FieldControl>
          </Field>
          <Field error="A PIN code is six digits." required>
            <FieldLabel>PIN code</FieldLabel>
            <FieldControl>
              <Input defaultValue="4400" />
            </FieldControl>
          </Field>
          <FormActions>
            <Button variant="ghost">Cancel</Button>
            <Button>Save address</Button>
          </FormActions>
        </Form>
      </Shot>

      <Shot name="toggles">
        <Group label="checkbox">
          <span className="flex items-center gap-2">
            <Checkbox id="g-c1" defaultChecked />
            <Label htmlFor="g-c1">Checked</Label>
          </span>
          <span className="flex items-center gap-2">
            <Checkbox id="g-c2" />
            <Label htmlFor="g-c2">Unchecked</Label>
          </span>
          <span className="flex items-center gap-2">
            <Checkbox id="g-c3" disabled defaultChecked />
            <Label htmlFor="g-c3">Disabled</Label>
          </span>
        </Group>
        <Group label="switch">
          <span className="flex items-center gap-2">
            <Switch id="g-s1" defaultChecked />
            <Label htmlFor="g-s1">On</Label>
          </span>
          <span className="flex items-center gap-2">
            <Switch id="g-s2" />
            <Label htmlFor="g-s2">Off</Label>
          </span>
        </Group>
        <Group label="toggle group">
          <ToggleGroup type="multiple" value={marks} onValueChange={setMarks} aria-label="Text style">
            <ToggleGroupItem value="bold" aria-label="Bold">
              <Bold className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="italic" aria-label="Italic">
              <Italic className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="underline" aria-label="Underline">
              <Underline className="size-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Toggle aria-label="Pin">Pin</Toggle>
        </Group>
      </Shot>

      <Shot name="choice">
        <Group label="segmented">
          <SegmentedControl
            label="View"
            value={view}
            onValueChange={setView}
            options={[
              { value: "all", label: "All" },
              { value: "open", label: "Open" },
              { value: "done", label: "Done" },
            ]}
          />
        </Group>
        <Group label="radio">
          <RadioGroup defaultValue="b" aria-label="Speed" className="flex gap-3">
            <span className="flex items-center gap-2">
              <RadioGroupItem value="a" id="g-r1" />
              <Label htmlFor="g-r1">Standard</Label>
            </span>
            <span className="flex items-center gap-2">
              <RadioGroupItem value="b" id="g-r2" />
              <Label htmlFor="g-r2">Express</Label>
            </span>
          </RadioGroup>
        </Group>
      </Shot>

      <Shot name="radio-cards">
        <RadioGroup defaultValue="express" aria-label="Delivery" className="grid w-full max-w-2xl gap-3 sm:grid-cols-2">
          <RadioCard value="standard" label="Standard" description="Three to five working days" />
          <RadioCard value="express" label="Express" description="Next working day before noon" />
        </RadioGroup>
      </Shot>

      <Shot name="select-and-combobox">
        <Group label="select">
          <Select defaultValue="pune">
            <SelectTrigger className="w-56" aria-label="Warehouse">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pune">Pune</SelectItem>
              <SelectItem value="nagpur">Nagpur</SelectItem>
              <SelectItem value="indore">Indore</SelectItem>
            </SelectContent>
          </Select>
        </Group>
        <Group label="combobox">
          <Combobox
            label="City"
            value={city}
            onValueChange={setCity}
            className="w-56"
            options={[
              { value: "pune", label: "Pune" },
              { value: "nagpur", label: "Nagpur" },
              { value: "indore", label: "Indore" },
            ]}
          />
        </Group>
      </Shot>

      <Shot name="file-dropzone">
        <div className="w-full max-w-xl">
          <FileDropzone
            label="Attach the signed delivery note"
            hint="PDF, PNG or JPEG, up to 5 MB"
            onFiles={() => {}}
          />
        </div>
      </Shot>

      <Shot name="keys">
        <Kbd keys={["mod", "k"]} />
        <Kbd keys={["shift", "f10"]} />
        <Kbd keys={["esc"]} />
      </Shot>
    </>
  );
}

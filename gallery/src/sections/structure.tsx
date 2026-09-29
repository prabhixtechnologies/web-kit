import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Avatar,
  AvatarFallback,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CodeBlock,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  type Column,
  CopyButton,
  DataTable,
  Pagination,
  Resizable,
  ScrollArea,
  Separator,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TablePager,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TreeView,
  type TreeNode,
  toneFor,
} from "@prabhixtechnologies/ui";
import { Group, Shot } from "../shot";

const CARD_VARIANTS = ["default", "raised", "sunken", "plain"] as const;

interface Order {
  id: string;
  customer: string;
  city: string;
  status: string;
  total: string;
}

const ORDERS: Order[] = [
  { id: "INV-1041", customer: "Acme Ltd", city: "Pune", status: "Dispatched", total: "₹12,400" },
  { id: "INV-1042", customer: "Bharat Traders", city: "Nagpur", status: "Packing", total: "₹3,150" },
  { id: "INV-1043", customer: "Coastal Supply", city: "Indore", status: "Overdue", total: "₹41,000" },
  { id: "INV-1044", customer: "Deccan Foods", city: "Pune", status: "Paid", total: "₹8,720" },
];

const COLUMNS: Column<Order>[] = [
  { key: "id", header: "Invoice", cell: (row) => <span className="font-mono text-xs">{row.id}</span>, width: "8rem" },
  { key: "customer", header: "Customer", cell: (row) => row.customer, sortable: true },
  { key: "city", header: "City", cell: (row) => row.city },
  {
    key: "status",
    header: "Status",
    // toneFor is the stable name-to-swatch mapping, so the same customer is always the same
    // colour without a colour stored per record.
    cell: (row) => <Badge tone={toneFor(row.status)}>{row.status}</Badge>,
  },
  { key: "total", header: "Total", cell: (row) => row.total, align: "right" },
];

const TREE: TreeNode[] = [
  {
    id: "inbox",
    label: "Inbox",
    children: [
      { id: "flagged", label: "Flagged" },
      { id: "waiting", label: "Waiting on someone" },
    ],
  },
  { id: "sent", label: "Sent" },
  { id: "archive", label: "Archive", children: [{ id: "2025", label: "2025" }] },
];

export function Structure() {
  const [page, setPage] = React.useState(3);
  const [split, setSplit] = React.useState(38);

  return (
    <>
      <Shot name="card-variants">
        <div className="grid w-full gap-3 lg:grid-cols-4">
          {CARD_VARIANTS.map((variant) => (
            <Card key={variant} variant={variant} padded>
              <CardHeader>
                <CardTitle>{variant}</CardTitle>
                <CardDescription>Customer since 2021</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-text-muted">Three open orders.</CardContent>
              <CardFooter>
                <Button size="sm" variant="outline">
                  Open
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </Shot>

      <Shot name="avatars-and-separator">
        <Group label="avatar">
          <Avatar>
            <AvatarFallback>AL</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>BT</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>CS</AvatarFallback>
          </Avatar>
        </Group>
        <Group label="separator">
          <div className="flex h-10 items-center gap-3">
            <span className="text-sm text-text-muted">Orders</span>
            <Separator orientation="vertical" />
            <span className="text-sm text-text-muted">Invoices</span>
            <Separator orientation="vertical" />
            <span className="text-sm text-text-muted">Returns</span>
          </div>
        </Group>
      </Shot>

      <Shot name="breadcrumb-and-pagination">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Dispatch</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Nagpur</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>INV-1043</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Pagination page={page} pageCount={9} onPageChange={setPage} />
      </Shot>

      <Shot name="stepper">
        <div className="grid w-full gap-6 lg:grid-cols-2">
          <Stepper
            label="Checkout"
            current={1}
            onStepSelect={() => {}}
            steps={[
              { id: "basket", label: "Basket" },
              { id: "address", label: "Address" },
              { id: "pay", label: "Pay" },
            ]}
          />
          <Stepper
            label="Onboarding"
            current={2}
            orientation="vertical"
            steps={[
              { id: "a", label: "Company" },
              { id: "b", label: "Warehouse" },
              { id: "c", label: "Couriers" },
              { id: "d", label: "Go live" },
            ]}
          />
        </div>
      </Shot>

      <Shot name="tabs">
        <Tabs defaultValue="open" className="w-full max-w-2xl">
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="dispatched">Dispatched</TabsTrigger>
            <TabsTrigger value="returns">Returns</TabsTrigger>
          </TabsList>
          <TabsContent value="open" className="pt-3 text-sm text-text-muted">
            Four orders are waiting to be packed.
          </TabsContent>
        </Tabs>
      </Shot>

      <Shot name="disclosure">
        <div className="grid w-full max-w-2xl gap-4">
          <Accordion type="single" collapsible defaultValue="terms">
            <AccordionItem value="terms">
              <AccordionTrigger>Payment terms</AccordionTrigger>
              <AccordionContent>Net 14 from the date of dispatch.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="returns">
              <AccordionTrigger>Returns</AccordionTrigger>
              <AccordionContent>Unopened boxes within 30 days.</AccordionContent>
            </AccordionItem>
          </Accordion>
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                Courier detail
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 text-sm text-text-muted">
              Picked up 09:14, scanned at the Pune hub 13:40.
            </CollapsibleContent>
          </Collapsible>
        </div>
      </Shot>

      <Shot name="table-plain">
        <div className="w-full overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ORDERS.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.id}</TableCell>
                  <TableCell>{row.customer}</TableCell>
                  <TableCell>
                    <Badge tone={toneFor(row.status)}>{row.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{row.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Shot>

      <Shot name="data-table">
        <div className="w-full">
          <DataTable
            columns={COLUMNS}
            rows={ORDERS}
            rowKey={(row) => row.id}
            sort={{ key: "customer", direction: "asc" }}
            onSortChange={() => {}}
          />
          <TablePager loaded={4} total={128} hasMore onLoadMore={() => {}} noun="invoices" />
        </div>
      </Shot>

      <Shot name="data-table-loading">
        {/* rows undefined is "not loaded yet", which is not an empty list. Both states are
            photographed because they are the two a table spends most of its life in. */}
        <div className="w-full">
          <DataTable columns={COLUMNS} rows={undefined} rowKey={(row) => row.id} loading />
        </div>
      </Shot>

      <Shot name="tree-and-scroll">
        <Group label="tree">
          <div className="w-64 rounded-lg border border-border bg-surface-raised p-2">
            <TreeView nodes={TREE} label="Folders" defaultExpandedIds={["inbox"]} selectedId="flagged" />
          </div>
        </Group>
        <Group label="scroll area">
          <ScrollArea label="Activity" className="h-40 w-64 rounded-lg border border-border bg-surface-raised p-3">
            <ul className="grid gap-2 text-sm text-text-muted">
              {["Created", "Packed", "Handed to courier", "In transit", "Out for delivery", "Attempted", "Rescheduled", "Delivered"].map(
                (event) => (
                  <li key={event}>{event}</li>
                ),
              )}
            </ul>
          </ScrollArea>
        </Group>
      </Shot>

      <Shot name="resizable">
        <div className="h-44 w-full overflow-hidden rounded-lg border border-border">
          <Resizable size={split} onSizeChange={setSplit} label="Resize the message list">
            <div className="h-full bg-surface-muted p-3 text-sm text-text-muted">List</div>
            <div className="h-full bg-surface-raised p-3 text-sm text-text-muted">Message</div>
          </Resizable>
        </div>
      </Shot>

      <Shot name="code-and-copy">
        <div className="grid w-full max-w-2xl gap-3">
          <CodeBlock
            title="deploy.sh"
            numbered
            code={"aws ecr get-login-password --region ap-south-1 \\\n  | docker login --username AWS --password-stdin"}
          />
          <Group label="copy">
            <CopyButton value="INV-1041" label="Copy invoice number" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm">
                    Hover target
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Opens in a new tab</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Group>
        </div>
      </Shot>
    </>
  );
}

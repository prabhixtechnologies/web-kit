import {
  Alert,
  Banner,
  Button,
  EmptyState,
  ErrorState,
  NoResultsState,
  Progress,
  Skeleton,
  Spinner,
} from "@prabhixtechnologies/ui";
import { Group, Shot } from "../shot";

const TONES = ["info", "success", "warning", "danger", "neutral"] as const;

export function Feedback() {
  return (
    <>
      {/* Every tone, because the status ramps are chosen per theme and this is where a theme
          that borrowed another's danger red becomes obvious. */}
      <Shot name="alert-tones">
        <div className="grid w-full max-w-3xl gap-3">
          {TONES.map((tone) => (
            <Alert key={tone} tone={tone} title={`${tone} alert`}>
              The courier could not reach the address on the second attempt.
            </Alert>
          ))}
        </div>
      </Shot>

      <Shot name="alert-with-action">
        <div className="grid w-full max-w-3xl gap-3">
          <Alert
            tone="warning"
            title="Two invoices are past due"
            action={<Button size="sm">Review</Button>}
          >
            Payment terms on this account are 14 days.
          </Alert>
          <Alert tone="danger" title="Card declined" onDismiss={() => {}}>
            The bank did not give a reason.
          </Alert>
          <Alert tone="info" icon={null} title="No icon">
            For a place where the surrounding layout already carries the status.
          </Alert>
        </div>
      </Shot>

      <Shot name="banner">
        <div className="w-full max-w-3xl overflow-hidden rounded-lg border border-border">
          <Banner tone="info" title="Scheduled maintenance on Sunday 02:00 IST">
            Dispatch will be read-only for about twenty minutes.
          </Banner>
          <div className="bg-surface-raised px-4 py-6 text-sm text-text-muted">
            Page content sits under the banner.
          </div>
        </div>
      </Shot>

      <Shot name="empty-states">
        <div className="grid w-full gap-3 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface-raised">
            <EmptyState
              title="No invoices yet"
              hint="Invoices appear here once an order is dispatched."
              action={<Button size="sm">Create invoice</Button>}
            />
          </div>
          <div className="rounded-lg border border-border bg-surface-raised">
            <NoResultsState query="nagpur warehouse" onClear={() => {}} />
          </div>
          <div className="rounded-lg border border-border bg-surface-raised">
            <ErrorState message="The dispatch service did not respond." onRetry={() => {}} />
          </div>
        </div>
      </Shot>

      <Shot name="progress-and-spinners">
        <Group label="spinner">
          <Spinner size="sm" label="Loading" />
          <Spinner label="Loading orders" />
          <Spinner size="lg" label="Loading" />
        </Group>
        <Group label="progress">
          <div className="grid w-72 gap-3">
            <Progress label="Upload" value={0} />
            <Progress label="Upload" value={35} />
            <Progress label="Upload" value={100} />
            {/* No value: an indeterminate bar, which is honest about not knowing. */}
            <Progress label="Upload" />
          </div>
        </Group>
      </Shot>

      <Shot name="skeleton">
        <div className="grid w-full max-w-md gap-3 rounded-lg border border-border bg-surface-raised p-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="size-10 rounded-full" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        </div>
      </Shot>
    </>
  );
}

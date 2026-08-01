import { Button } from "@/components/ui/Button";
import { getContactById } from "@/db/queries/contacts";
import { listActiveProducts } from "@/db/queries/engagements";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddEngagementForm } from "./AddEngagementForm";
import { DeleteContactButton } from "./DeleteContactButton";
import { EngagementPanel } from "./EngagementPanel";
import { LogInteractionForm } from "./LogInteractionForm";
import { Timeline } from "./Timeline";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [contact, activeProducts] = await Promise.all([
    getContactById(id),
    listActiveProducts(),
  ]);

  if (!contact) notFound();

  const engagedProductIds = new Set(contact.engagements.map((e) => e.productId));
  const availableProducts = activeProducts.filter((p) => !engagedProductIds.has(p.id));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-display-sm uppercase tracking-[0.04em] text-text">
            {contact.name}
          </h1>
          {contact.company && <p className="text-body text-text-muted">{contact.company}</p>}
        </div>
        <div className="flex items-start gap-2">
          <Link href={`/contacts/${contact.id}/edit`}>
            <Button variant="secondary">Edit contact</Button>
          </Link>
          <DeleteContactButton contactId={contact.id} />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-body">
        <div>
          <dt className="text-body-sm text-text-muted">Phone</dt>
          <dd className="font-mono text-mono text-text">{contact.phone ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-body-sm text-text-muted">Other numbers</dt>
          <dd className="font-mono text-mono text-text">
            {contact.phoneAlt?.join(", ") || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-body-sm text-text-muted">Email</dt>
          <dd className="text-text">{contact.email ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-body-sm text-text-muted">Source</dt>
          <dd className="text-text">{contact.source ?? "—"}</dd>
        </div>
        {contact.referredByContact && (
          <div>
            <dt className="text-body-sm text-text-muted">Referred by</dt>
            <dd>
              <Link
                href={`/contacts/${contact.referredByContact.id}`}
                className="text-accent hover:text-accent-hover"
              >
                {contact.referredByContact.name}
              </Link>
            </dd>
          </div>
        )}
        {contact.referrals.length > 0 && (
          <div>
            <dt className="text-body-sm text-text-muted">Referred</dt>
            <dd className="flex flex-wrap gap-x-2">
              {contact.referrals.map((r) => (
                <Link
                  key={r.id}
                  href={`/contacts/${r.id}`}
                  className="text-accent hover:text-accent-hover"
                >
                  {r.name}
                </Link>
              ))}
            </dd>
          </div>
        )}
        {contact.notes && (
          <div className="col-span-2">
            <dt className="text-body-sm text-text-muted">Notes</dt>
            <dd className="whitespace-pre-wrap text-text">{contact.notes}</dd>
          </div>
        )}
      </dl>

      <div className="flex flex-col gap-4">
        <h2 className="font-display text-body-lg uppercase tracking-[0.04em] text-text-muted">
          Engagements
        </h2>
        {contact.engagements.map((engagement) => (
          <EngagementPanel
            key={engagement.id}
            contactId={contact.id}
            engagement={{
              id: engagement.id,
              productName: engagement.product.name,
              stage: engagement.stage,
              tier: engagement.tier,
              interestNote: engagement.interestNote,
              nextActions: engagement.nextActions,
            }}
          />
        ))}
        <AddEngagementForm contactId={contact.id} availableProducts={availableProducts} />
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="font-display text-body-lg uppercase tracking-[0.04em] text-text-muted">
          Timeline
        </h2>
        <LogInteractionForm
          contactId={contact.id}
          engagements={contact.engagements.map((e) => ({
            id: e.id,
            productName: e.product.name,
          }))}
        />
        <Timeline engagements={contact.engagements} />
      </div>
    </div>
  );
}

import { getStandardsPage, Prose, PageTitle } from "@/components/public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page() {
  const page = await getStandardsPage("advertising-sponsorship");
  return (
    <div>
      <PageTitle>{page?.title || "Advertising & Sponsorship Policy"}</PageTitle>
      <Prose body={page?.body || ""} />
    </div>
  );
}

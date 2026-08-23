import { getStandardsPage, Prose, PageTitle } from "@/components/public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page() {
  const page = await getStandardsPage("ownership-funding");
  return (
    <div>
      <PageTitle>{page?.title || "Ownership & Funding"}</PageTitle>
      <Prose body={page?.body || ""} />
    </div>
  );
}

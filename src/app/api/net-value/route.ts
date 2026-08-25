import { NextResponse } from "next/server";

import { createDataRevision } from "@/lib/data-revision";
import { loadNavHistory } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await loadNavHistory();

  return NextResponse.json(
    { revision: createDataRevision(data), data },
    { headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" } },
  );
}
